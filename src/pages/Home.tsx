import { useState } from 'react';
import { useRecording } from '../hooks/useRecording';
import { transcribeAudio, enhanceText } from '../services/api';
import { Transcription } from '../types';

export default function Home() {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useRecording();

  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStopRecording = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 停止录音并获取处理后的音频数据
      const audioBlob = await stopRecording();
      
      if (!audioBlob) {
        throw new Error('录音数据获取失败');
      }

      // 转录音频
      const transcriptionResult = await transcribeAudio(audioBlob);
      if (!transcriptionResult.success || !transcriptionResult.data) {
        throw new Error(transcriptionResult.error);
      }

      // 优化文本
      const enhancementResult = await enhanceText(transcriptionResult.data);
      if (!enhancementResult.success || !enhancementResult.data) {
        throw new Error(enhancementResult.error);
      }

      // 创建新的转录记录
      const newTranscription: Transcription = {
        id: Date.now().toString(),
        audioUrl: URL.createObjectURL(audioBlob),
        originalText: transcriptionResult.data,
        enhancedText: enhancementResult.data.text,
        tags: enhancementResult.data.tags,
        createdAt: new Date().toISOString(),
      };

      setCurrentTranscription(newTranscription);

      // 保存到历史记录
      const savedHistory = localStorage.getItem('transcriptionHistory');
      const history = savedHistory ? JSON.parse(savedHistory) : [];
      localStorage.setItem('transcriptionHistory', JSON.stringify([newTranscription, ...history]));
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">录音</h2>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={isRecording ? handleStopRecording : startRecording}
            className={`px-4 py-2 rounded-full ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-primary hover:bg-primary/90'
            } text-white font-medium`}
          >
            {isRecording ? '停止录音' : '开始录音'}
          </button>
          {isRecording && (
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="px-4 py-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white font-medium"
            >
              {isPaused ? '继续录音' : '暂停录音'}
            </button>
          )}
        </div>
        {isRecording && (
          <div className="mt-4 text-center text-gray-600">
            录音时长: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="text-gray-600">处理中...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {currentTranscription && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">原始文本</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{currentTranscription.originalText}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">优化文本</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{currentTranscription.enhancedText}</p>
          </div>

          {currentTranscription.tags.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">相关标签</h2>
              <div className="flex flex-wrap gap-2">
                {currentTranscription.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 