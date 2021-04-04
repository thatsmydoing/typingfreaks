  let apiPromise: Promise<void>;

  export function loadYoutubeApi(): Promise<void> {
    if (apiPromise) {
      return apiPromise;
    }
    console.time('Loading YouTube API');
    apiPromise = new Promise((resolve, _) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        console.timeEnd('Loading YouTube API');
        resolve();
      }
      document.body.appendChild(tag);
    });
    return apiPromise;
  }

  export async function createPlayer(element: HTMLElement): Promise<YT.Player> {
    await loadYoutubeApi();
    console.time('Loading YouTube player');
    return new Promise((resolve, reject) => {
      const player = new YT.Player(element, {
        height: '100%',
        width: '100%',
        events: {
          onReady: () => {
            console.timeEnd('Loading YouTube player');
            resolve(player);
          },
          onError: ({ data }) => {
            reject(data);
          }
        },
        playerVars: {
          disablekb: 1,
          rel: 0,
          iv_load_policy: 3,
          fs: 0
        }
      });
    });
  }

  export function getVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('youtube.com')) {
        return null;
      }
      return parsed.searchParams.get('v');
    } catch {
      return null;
    }
  }
