import { ApiResponse } from '../types';

const API_KEY = import.meta.env.VITE_SILICONFLOW_API_KEY;
const BASE_URL = import.meta.env.VITE_SILICONFLOW_BASE_URL;

if (!API_KEY) {
  throw new Error('请在 .env 文件中设置 VITE_SILICONFLOW_API_KEY');
}

if (!BASE_URL) {
  throw new Error('请在 .env 文件中设置 VITE_SILICONFLOW_BASE_URL');
}

export const transcribeAudio = async (audioBlob: Blob): Promise<ApiResponse<string>> => {
  try {
    console.log('开始转录音频，音频大小:', audioBlob.size, '类型:', audioBlob.type);
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'FunAudioLLM/SenseVoiceSmall');
    formData.append('language', 'zh');
    formData.append('response_format', 'json');
    formData.append('temperature', '0.2');
    formData.append('prompt', '请将以下音频转换为文字，保持原意完整。');

    console.log('准备发送请求到:', `${BASE_URL}/v1/audio/transcriptions`);
    console.log('请求头:', {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    });

    const response = await fetch(`${BASE_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    console.log('API 响应状态:', response.status);
    const data = await response.json();
    console.log('API 响应数据:', data);
    
    if (!response.ok) {
      console.error('API 错误响应:', data);
      throw new Error(data.error?.message || '转录请求失败');
    }

    if (!data.text) {
      console.warn('API 返回的文本为空');
    }

    return {
      success: true,
      data: data.text,
    };
  } catch (error) {
    console.error('转录错误:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '转录失败',
    };
  }
};

export const enhanceText = async (text: string): Promise<ApiResponse<{ text: string; tags: string[] }>> => {
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'system',
            content: '你是一个文本优化助手。请优化以下文本，使其更加流畅，并生成三个相关的标签。标签格式为 #标签名。',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.7,
        response_format: {
          type: 'text'
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('API 错误响应:', data);
      throw new Error(data.error?.message || '文本优化请求失败');
    }
    
    // 从响应中提取标签
    const content = data.choices[0].message.content;
    const tags = content.match(/#[\w\u4e00-\u9fa5]+/g) || [];
    
    return {
      success: true,
      data: {
        text: content,
        tags: tags.map((tag: string) => tag.slice(1)), // 移除 # 前缀
      },
    };
  } catch (error) {
    console.error('文本优化错误:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '文本优化失败',
    };
  }
}; 