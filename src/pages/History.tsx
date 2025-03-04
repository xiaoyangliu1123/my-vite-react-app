import { useState, useEffect } from 'react';
import { Transcription } from '../types';

export default function History() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 加载历史记录
    const loadHistory = () => {
      try {
        const savedHistory = localStorage.getItem('transcriptionHistory');
        if (savedHistory) {
          setTranscriptions(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">暂无历史记录</h3>
        <p className="mt-2 text-gray-500">开始录音来创建第一条记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transcriptions.map((transcription) => (
        <div key={transcription.id} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {new Date(transcription.createdAt).toLocaleString()}
              </h3>
              <audio
                controls
                src={transcription.audioUrl}
                className="h-8"
              />
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">原始文本</h4>
                <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                  {transcription.originalText}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">优化文本</h4>
                <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                  {transcription.enhancedText}
                </p>
              </div>

              {transcription.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">相关标签</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {transcription.tags.map((tag, index) => (
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
          </div>
        </div>
      ))}
    </div>
  );
} 