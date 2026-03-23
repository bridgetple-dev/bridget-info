import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.allowRemoteModels = true;

let translator = null;
let loadedModelId = null;

self.onmessage = async function(e) {
  const { blocks, modelId } = e.data;

  try {
    // 모델이 없거나 다른 언어 쌍이면 새로 로드
    if (!translator || loadedModelId !== modelId) {
      self.postMessage({
        type: 'progress',
        text: '번역 모델 다운로드 중...',
        pct: 0,
        detail: modelId.split('/').pop() + ' (~30MB)'
      });
      translator = await pipeline('translation', modelId, { quantized: true });
      loadedModelId = modelId;
    }

    const total = blocks.length;
    for (let i = 0; i < total; i++) {
      self.postMessage({
        type: 'progress',
        text: `${i + 1}번째 문단 번역 중...`,
        pct: Math.floor(i / total * 100),
        detail: `${i} / ${total} 블록`
      });

      try {
        const result = await translator(blocks[i]);
        self.postMessage({ type: 'translated', index: i, result: result[0].translation_text });
      } catch (err) {
        self.postMessage({ type: 'block_error', index: i, error: err.message });
      }
    }

    self.postMessage({
      type: 'done',
      text: '번역 완료!',
      pct: 100,
      detail: `${total} / ${total} 블록 완료`
    });

  } catch (err) {
    self.postMessage({ type: 'error', text: '오류 발생', detail: err.message });
  }
};
