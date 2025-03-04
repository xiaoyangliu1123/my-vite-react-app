import { useState, useRef, useCallback } from 'react';
import { RecordingState } from '../types';

export const useRecording = () => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // 先重置所有状态
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioBlob: null,
      }));

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // 检查支持的 MIME 类型
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('录音停止，开始处理音频数据');
        const webmBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log('WebM 音频大小:', webmBlob.size, '类型:', webmBlob.type);
        
        // 将 webm 转换为 wav
        const audioContext = new AudioContext();
        const arrayBuffer = await webmBlob.arrayBuffer();
        console.log('音频数据大小:', arrayBuffer.byteLength);
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('解码后的音频信息:', {
          duration: audioBuffer.duration,
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
        });
        
        // 创建 WAV 文件
        const wavBlob = await audioBufferToWav(audioBuffer);
        console.log('WAV 音频大小:', wavBlob.size, '类型:', wavBlob.type);
        
        // 先停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }

        // 更新状态
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob: wavBlob,
        }));
      };

      mediaRecorder.start(1000); // 每秒收集一次数据
      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current!) / 1000),
        }));
      }, 1000);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
      }));
    } catch (error) {
      console.error('录音失败:', error);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioBlob: null,
      }));
    }
  }, []);

  // 将 AudioBuffer 转换为 WAV Blob
  const audioBufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    // WAV 文件头
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF 标识符
    writeString(view, 0, 'RIFF');
    // 文件长度
    view.setUint32(4, 36 + buffer.length * blockAlign, true);
    // WAVE 标识符
    writeString(view, 8, 'WAVE');
    // fmt 子块
    writeString(view, 12, 'fmt ');
    // 子块长度
    view.setUint32(16, 16, true);
    // 音频格式
    view.setUint16(20, format, true);
    // 声道数
    view.setUint16(22, numChannels, true);
    // 采样率
    view.setUint32(24, sampleRate, true);
    // 字节率
    view.setUint32(28, sampleRate * blockAlign, true);
    // 块对齐
    view.setUint16(32, blockAlign, true);
    // 位深度
    view.setUint16(34, bitDepth, true);
    // data 子块
    writeString(view, 36, 'data');
    // 数据长度
    view.setUint32(40, buffer.length * blockAlign, true);
    
    // 写入音频数据
    const data = new Float32Array(buffer.length * numChannels);
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        data[i * numChannels + channel] = buffer.getChannelData(channel)[i];
      }
    }
    
    // 将 Float32Array 转换为 Int16Array
    const int16Data = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16Data[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
    }
    
    // 合并头部和数据
    const blob = new Blob([header, int16Data.buffer], { type: 'audio/wav' });
    return blob;
  };

  // 辅助函数：写入字符串到 DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      return new Promise<Blob>((resolve) => {
        const mediaRecorder = mediaRecorderRef.current!;
        const originalOnStop = mediaRecorder.onstop;
        mediaRecorder.onstop = async () => {
          console.log('录音停止，开始处理音频数据');
          const webmBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
          console.log('WebM 音频大小:', webmBlob.size, '类型:', webmBlob.type);
          
          // 将 webm 转换为 wav
          const audioContext = new AudioContext();
          const arrayBuffer = await webmBlob.arrayBuffer();
          console.log('音频数据大小:', arrayBuffer.byteLength);
          
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          console.log('解码后的音频信息:', {
            duration: audioBuffer.duration,
            numberOfChannels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate,
          });
          
          // 创建 WAV 文件
          const wavBlob = await audioBufferToWav(audioBuffer);
          console.log('WAV 音频大小:', wavBlob.size, '类型:', wavBlob.type);
          
          // 先停止所有音轨
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
          }

          // 更新状态
          setState((prev) => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            audioBlob: wavBlob,
          }));

          // 调用原始的 onstop 处理函数（如果有的话）
          if (originalOnStop) {
            originalOnStop.call(mediaRecorder, new Event('stop'));
          }

          resolve(wavBlob);
        };
        mediaRecorder.stop();
      });
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      setState((prev) => ({
        ...prev,
        isPaused: true,
      }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now() - (state.duration * 1000);
      timerRef.current = window.setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current!) / 1000),
        }));
      }, 1000);
      setState((prev) => ({
        ...prev,
        isPaused: false,
      }));
    }
  }, [state.isRecording, state.isPaused, state.duration]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}; 