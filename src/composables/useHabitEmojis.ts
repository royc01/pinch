import { onMounted, ref, shallowRef } from 'vue';
import { getEmojiConf } from '@/api';

export interface MoodEmojiItem {
  id: string;
  emoji: string;
  largeSvg: string;
  smallSvg: string;
}

// Emoji 检测正则表达式，避免重复创建
const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|\ud83c[\udde6-\uddff]|\ud83c[\udff0-\udfff]|\ud83d[\udc00-\ude4f]|\ud83d[\ude80-\udeff]|\ud83e[\udd10-\uddff])|[^\x00-\xFF]/u;

export function useHabitEmojis() {
  const emojisLoading = ref(true);
  const emojiCategories = shallowRef<Record<string, string[]>>({});

  // 情绪打卡专用 SVG
  const moodEmojis = shallowRef<MoodEmojiItem[]>([
    { id: 'excited', emoji: '🤩', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#FDD07D"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><path d="M34.5,50.5c3.4,4.8,7.8,7.4,16.2,7.4c9.9,0,14.8-5.7,15.8-7.4" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M42.9,33c0-2.1-2-5.3-5.5-5.3c-2.9,0-5.7,2.5-5.7,5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M69,33c0-2.1-2-5.3-5.5-5.3c-2.9,0-5.7,2.5-5.7,5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M0,24.9V100h100V24.9C88.6,9.8,70.4,0,50,0S11.4,9.8,0,24.9z" fill="#FDD07D"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2"/><circle cx="41.3" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="4.2"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><path d="M41.8,25.9c1.8,2.5,4.1,3.9,8.6,3.9c5.3,0,7.8-3,8.4-3.9" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M46.2,16.6c0-1.1-1.1-2.8-2.9-2.8c-1.5,0-3,1.3-3,2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M60.1,16.6c0-1.1-1.1-2.8-2.9-2.8c-1.5,0-3,1.3-3,2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
    { id: 'happy', emoji: '😊', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M78.3,100H21.7C8.2,100-2,88.7,0.3,76.5l11.5-59.9C13.7,7,22.7,0,33.2,0h34c10.6,0,19.6,7,21.4,16.6l11.2,59.9C102,88.8,91.8,100,78.3,100z" fill="#8aae97"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><path d="M39.2,52.7c2.4,3.4,5.6,5.3,11.6,5.3c7.1,0,10.6-4.1,11.3-5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M12.3,11.5L0,45.9V100h100V50.5L87,11.8C84.6,4.8,78,0,70.6,0H28.6C21.3,0,14.8,4.6,12.3,11.5z" fill="#8aae97"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="4.2" fill="#000000"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><path d="M44.3,27c1.3,1.8,3,2.8,6.1,2.8c3.7,0,5.6-2.2,6-2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
    { id: 'calm', emoji: '😌', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M37.2,4.5L8.8,26C1.6,31.4-1.4,40.8,1.3,49.3l11.2,35.7c2.8,8.9,11,14.9,20.3,14.9h34.5c9.3,0,17.5-6,20.3-14.9l11.2-35.7c2.7-8.6-0.3-17.9-7.5-23.3L62.8,4.5C55.3-1.2,44.8-1.2,37.2,4.5z" fill="#89b0bc"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><line x1="41.6" y1="52.7" x2="59.9" y2="52.7" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M91.6,26L62.8,4.3c-7.6-5.7-18-5.7-25.6,0L8.4,26C2.9,30.2-0.2,36.8,0,43.5h0v56.5h100.1V43.5h0C100.2,36.8,97.2,30.2,91.6,26z" fill="#89b0bc"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57" cy="16.5" r="4.2" fill="#000000"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><line x1="45.5" y1="27" x2="55.2" y2="27" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
    { id: 'sad', emoji: '😢', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M69.6,100H30.4C13.6,100,0,86.4,0,69.6V30.4C0,13.6,13.6,0,30.4,0h39.1C86.4,0,100,13.6,100,30.4v39.1C100,86.4,86.4,100,69.6,100z" fill="#f192c9"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><path d="M23.6,24.9c1.4,0.1,4.2,0.5,7.5-1c4.1-2,5.5-4.4,6.7-6.8" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M76.9,24.9c-1.4,0.1-4.2,0.5-7.5-1c-4.1-2-5.5-4.4-6.7-6.8" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M69.6,100H30.5C13.7,100,0,86.4,0,69.6V30.5C0,13.7,13.7,0,30.5,0h39.1C86.4,0,100,13.7,100,30.5v39.1C100,86.4,86.4,100,69.6,100z" fill="#f192c9"/><circle cx="43.3" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.5" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.5" r="1.4" fill="#FFFFFF"/><circle cx="57.1" cy="16.5" r="5.8" fill="#FFFFFF"/><circle cx="57.1" cy="16.5" r="4.2" fill="#000000"/><circle cx="55" cy="14.5" r="1.4" fill="#FFFFFF"/><path d="M36,12.3c0.7,0.1,2.2,0.3,4-0.5c2.2-1,2.9-2.3,3.6-3.6" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M64.3,12.3c-0.7,0.1-2.2,0.3-4-0.5c-2.2-1-2.9-2.3-3.6-3.6" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' },
    { id: 'angry', emoji: '😡', largeSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M59.3,4l2.9,3.1c2.5,2.7,6,4.1,9.7,4l4.2-0.1c7.3-0.2,13.3,5.8,13.1,13.1l-0.1,4.2c-0.1,3.7,1.3,7.2,4,9.7l3.1,2.9c5.4,5,5.4,13.5,0,18.5l-3.1,2.9c-2.7,2.5-4.1,6-4,9.7l0.1,4.2c0.2,7.3-5.8,13.3-13.1,13.1l-4.2-0.1c-3.7-0.1-7.2,1.3-9.7,4L59.3,96c-5,5.4-13.5,5.4-18.5,0l-2.9-3.1c-2.5-2.7-6-4.1-9.7-4L24,89.1c-7.3,0.2-13.3-5.8-13.1-13.1l0.1-4.2c0.1-3.7-1.3-7.2-4-9.7L4,59.3c-5.4-5-5.4-13.5,0-18.5l3.1-2.9c2.7-2.5,4.1-6,4-9.7L10.9,24c-0.2-7.3,5.8-13.3,13.1-13.1l4.2,0.1c3.7,0.1,7.2-1.3,9.7-4L40.7,4C45.8-1.3,54.2-1.3,59.3,4z" fill="#fc8f7b"/><circle cx="37.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="37.3" cy="32.8" r="8" fill="#000000"/><circle cx="33.4" cy="29" r="2.7" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="10.9" fill="#FFFFFF"/><circle cx="63.3" cy="32.8" r="8" fill="#000000"/><circle cx="59.4" cy="29" r="2.7" fill="#FFFFFF"/><path d="M34.1,17.7c0.5,1,1.7,2.6,4.3,4.1c3.2,1.9,4.9,2.3,7.7,2.4" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M61.5,56.2c-0.7-1.2-4.2-5.3-11.3-5.3c-6,0-9.2,1.9-11.6,5.3" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M66.7,17.7c-0.5,1-1.7,2.6-4.3,4.1c-3.2,1.9-4.9,2.3-7.7,2.4" stroke="#000000" stroke-width="3" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>', smallSvg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M38,7c-2.5,2.7-6,4.1-9.7,4L0,10.9V100h100V11l-28.1,0.1c-3.7,0.1-7.2-1.3-9.7-4L59.3,4c-5-5.3-13.5-5.3-18.5,0L38,7z" fill="#fc8f7b"/><circle cx="43.3" cy="16.6" r="5.8" fill="#FFFFFF"/><circle cx="43.3" cy="16.6" r="4.2" fill="#000000"/><circle cx="41.2" cy="14.6" r="1.4" fill="#FFFFFF"/><circle cx="57.1" cy="16.6" r="5.8" fill="#FFFFFF"/><circle cx="57.1" cy="16.6" r="4.2" fill="#000000"/><circle cx="55" cy="14.6" r="1.4" fill="#FFFFFF"/><path d="M41.6,8.6c0.3,0.5,0.9,1.4,2.3,2.2c1.7,1,2.6,1.2,4.1,1.3" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M56.1,29c-0.4-0.6-2.2-2.8-6-2.8c-3.2,0-4.9,1-6.1,2.8" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/><path d="M58.9,8.6c-0.3,0.5-0.9,1.4-2.3,2.2c-1.7,1-2.6,1.2-4.1,1.3" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-miterlimit="10"/></svg>' }
  ]);

  function getMoodSvg(emoji: string, size: 'large' | 'small' = 'large'): string {
    const mood = moodEmojis.value.find(item => item.emoji === emoji);
    return mood ? (size === 'large' ? mood.largeSvg : mood.smallSvg) : '';
  }

  function getSmallMoodSvg(emoji: string): string {
    return getMoodSvg(emoji, 'small');
  }

  function convertHexToEmoji(hexCode: string): string {
    try {
      if (/[^\u0000-\u00ff]/.test(hexCode)) {
        return hexCode;
      }
      if (typeof hexCode === 'string' && (hexCode.includes('.') || hexCode.includes('/'))) {
        return hexCode;
      }
      if (typeof hexCode === 'string') {
        const hexPattern = /^[0-9a-fA-F]+(-[0-9a-fA-F]+)*$/;
        if (hexPattern.test(hexCode)) {
          const cleanHex = hexCode.replace(/^U\+|0x|\\u/g, '').replace(/-/g, ' ');
          const codePoints = cleanHex.split(' ').map(value => parseInt(value, 16));
          if (codePoints.some(Number.isNaN)) {
            return hexCode;
          }
          return String.fromCodePoint(...codePoints);
        }
      }
      return hexCode;
    } catch (error) {
      console.warn('无法转换十六进制代码到emoji:', hexCode, error);
      return hexCode;
    }
  }

  function extractEmojiFromItem(item: unknown): string | null {
    if (!item) return null;
    if (typeof item === 'string') return item;
    if (typeof item !== 'object') return null;

    const record = item as Record<string, unknown>;
    if (typeof record.ch === 'string') return record.ch;
    if (typeof record.emoji === 'string') return record.emoji;
    if (typeof record.text === 'string') return record.text;
    if (typeof record.unicode === 'string') return convertHexToEmoji(record.unicode);

    const values = Object.values(record);
    for (const value of values) {
      if (typeof value === 'string' && value.length <= 5 && EMOJI_REGEX.test(value)) {
        return value;
      }
    }
    return null;
  }

  function extractEmojisFromItems(items: unknown[]): string[] {
    const emojis: string[] = [];
    for (const item of items) {
      const emoji = extractEmojiFromItem(item);
      if (emoji) {
        emojis.push(emoji);
      }
    }
    return emojis;
  }

  async function loadSiyuanEmojis(): Promise<void> {
    try {
      emojisLoading.value = true;
      const emojiConf: any = await getEmojiConf();
      if (!emojiConf) return;

      const categories: Record<string, string[]> = {};

      if (Array.isArray(emojiConf)) {
        for (const emojiCategory of emojiConf) {
          if (emojiCategory?.items && Array.isArray(emojiCategory.items)) {
            const categoryName = emojiCategory.title_zh_cn || emojiCategory.title || emojiCategory.id;
            if (categoryName && categoryName !== '自定义' && categoryName !== 'Custom') {
              categories[categoryName] = extractEmojisFromItems(emojiCategory.items);
            }
          }
        }
      } else {
        for (const category in emojiConf) {
          const categoryData = emojiConf[category];

          if (Array.isArray(categoryData)) {
            categories[category] = categoryData
              .map((item: any) => item.ch)
              .filter((value: unknown) => typeof value === 'string');
            continue;
          }

          if (categoryData?.items && Array.isArray(categoryData.items)) {
            const categoryName = categoryData.title_zh_cn || categoryData.title || categoryData.id || category;
            if (categoryName !== '自定义' && categoryName !== 'Custom') {
              categories[categoryName] = extractEmojisFromItems(categoryData.items);
            }
          } else if (categoryData?.ch) {
            categories[category] = [categoryData.ch];
          } else {
            categories[category] = Object.values(categoryData).filter(v => typeof v === 'string') as string[];
          }
        }
      }

      emojiCategories.value = categories;
    } catch (error) {
      console.error('获取思源笔记emoji配置失败:', error);
    } finally {
      emojisLoading.value = false;
    }
  }

  onMounted(() => {
    void loadSiyuanEmojis();
  });

  return {
    emojisLoading,
    emojiCategories,
    moodEmojis,
    getMoodSvg,
    getSmallMoodSvg
  };
}
