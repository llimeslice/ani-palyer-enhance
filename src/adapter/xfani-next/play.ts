import { KPlayer } from '../../player'
import { logHis } from '../common/history'
import { sleep } from '../../utils/sleep'

const PLAYER_SELECTOR = 'media-controller'
const MEDIA_SELECTOR = ':scope > [slot="media"]'
const PLAYER_WAIT_TIMEOUT = 15_000
const PLAYER_WAIT_INTERVAL = 100

type PlaybackMedia = {
  controller: HTMLElement
  video: HTMLVideoElement
  source: string
}

function findNativeVideo(root: ParentNode): HTMLVideoElement | undefined {
  const video = root.querySelector<HTMLVideoElement>(
    'video[slot="media"], video'
  )
  if (video) return video

  const nestedRoots: ShadowRoot[] = []
  if (root instanceof HTMLElement && root.shadowRoot) {
    nestedRoots.push(root.shadowRoot)
  }
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    if (element.shadowRoot) nestedRoots.push(element.shadowRoot)
  })

  for (const nestedRoot of nestedRoots) {
    const nestedVideo = findNativeVideo(nestedRoot)
    if (nestedVideo) return nestedVideo
  }
}

function getPlaybackMedia(): PlaybackMedia | undefined {
  const controller = document.querySelector<HTMLElement>(PLAYER_SELECTOR)
  if (!controller) return

  const media = controller.querySelector<HTMLElement>(MEDIA_SELECTOR)
  if (!media) return

  const nativeVideo =
    media instanceof HTMLVideoElement
      ? media
      : (media as HTMLElement & { nativeEl?: unknown }).nativeEl instanceof
        HTMLVideoElement
      ? (media as HTMLElement & { nativeEl: HTMLVideoElement }).nativeEl
      : findNativeVideo(media.shadowRoot ?? media)
  if (!nativeVideo) return

  const source =
    media !== nativeVideo
      ? media.getAttribute('src') ||
        (media as HTMLElement & { src?: string }).src ||
        nativeVideo.currentSrc
      : nativeVideo.currentSrc || nativeVideo.src
  if (!source) return

  return { controller, video: nativeVideo, source }
}

async function waitForPlaybackMedia() {
  const deadline = Date.now() + PLAYER_WAIT_TIMEOUT

  while (Date.now() < deadline) {
    const media = getPlaybackMedia()
    if (media) return media
    await sleep(PLAYER_WAIT_INTERVAL)
  }

  console.warn('[agefans-enhance] 稀饭动漫 Next 播放器节点或播放地址未就绪')
}

function getEpisodeLinks() {
  const animeId = getAnimeId()
  if (!animeId) return []

  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      `a[href^="/anime/${animeId}/play/"]`
    )
  )
}

function isCurrentEpisode(link: HTMLAnchorElement) {
  const url = new URL(link.href)
  return url.pathname === location.pathname && url.search === location.search
}

function getCurrentEpisodeLink() {
  return getEpisodeLinks().find(isCurrentEpisode)
}

export function getAnimeId() {
  return location.pathname.match(/^\/anime\/(\d+)/)?.[1] || ''
}

export function getSearchName() {
  return document.title
    .replace(/\s*[·.]\s*稀饭动漫 Next\s*$/, '')
    .replace(/\s*第\s*\d+\s*集.*$/, '')
    .trim()
}

export function getEpisodeName() {
  return getCurrentEpisodeLink()?.textContent?.trim() || ''
}

function navigateEpisode(next: boolean, player: KPlayer) {
  const episodes = getEpisodeLinks()
  const current = episodes.findIndex(isCurrentEpisode)
  const target = episodes[current + (next ? 1 : -1)]

  if (!target) {
    player.message.destroy()
    player.message.info(next ? '没有下一集了' : '没有上一集了')
    return
  }

  location.assign(target.href)
}

function interceptEpisodeNavigation() {
  document.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return

      const target = (event.target as Element).closest<HTMLAnchorElement>(
        'a[href]'
      )
      if (!target || !getEpisodeLinks().includes(target)) return

      event.preventDefault()
      if (!isCurrentEpisode(target)) location.assign(target.href)
    },
    true
  )
}

export async function run() {
  const media = await waitForPlaybackMedia()
  if (!media) return

  const { controller, video, source } = media
  const player = new KPlayer(controller, { video })

  player.$wrapper.addClass('xfani-next-player')
  player.src = source

  interceptEpisodeNavigation()

  player.on('prev', () => navigateEpisode(false, player))
  player.on('next', () => navigateEpisode(true, player))
  player.on('timeupdate', () => {
    logHis(
      {
        animeName: getSearchName(),
        episodeName: getEpisodeName(),
        id: getAnimeId(),
        url: location.href,
      },
      player.currentTime
    )
  })
}
