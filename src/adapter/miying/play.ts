import { KPlayer } from '../../player'
import { wait } from '../../utils/wait'
import { logHis } from '../common/history'

const PLAYER_SELECTOR = '.video-iframe.playbox'
const VIDEO_SELECTOR = `${PLAYER_SELECTOR} video`
const PLAY_PATH_RE = /^\/vodplay\/(\d+)-(\d+)-(\d+)\.html$/

function getPlayContext() {
  const match = window.location.pathname.match(PLAY_PATH_RE)
  if (!match) return

  return {
    animeId: match[1],
    sourceId: match[2],
  }
}

function getEpisodeNumber(link: HTMLAnchorElement) {
  const match = new URL(link.href).pathname.match(PLAY_PATH_RE)
  return match ? Number(match[3]) : 0
}

function getEpisodeLinks() {
  const context = getPlayContext()
  if (!context) return []

  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/vodplay/"]')
  )
    .filter((link) => {
      const match = new URL(link.href).pathname.match(PLAY_PATH_RE)
      return match?.[1] === context.animeId && match[2] === context.sourceId
    })
    .sort((a, b) => getEpisodeNumber(a) - getEpisodeNumber(b))
}

function navigateEpisode(diff: number, player: KPlayer) {
  const context = getPlayContext()
  const episodes = getEpisodeLinks()
  const current = episodes.findIndex(
    (link) => new URL(link.href).pathname === window.location.pathname
  )
  const target = episodes[current + diff]

  if (!context || !target) {
    player.message.destroy()
    player.message.info(diff > 0 ? '没有下一集了' : '没有上一集了')
    return
  }

  window.location.assign(target.href)
}

export function getAnimeId() {
  return getPlayContext()?.animeId || ''
}

export function getSearchName() {
  return $('.pv-vod-title').first().text().trim()
}

export function getEpisodeName() {
  return (
    $('.pv-ep-btn.active').first().text().trim() ||
    $('em').first().text().trim()
  )
}

export async function run() {
  await wait(() =>
    Boolean(
      document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR)?.currentSrc
    )
  )

  const video = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR)!
  const source = video.currentSrc
  const player = new KPlayer(PLAYER_SELECTOR, { video })

  $('body').addClass('miying')
  player.$wrapper.addClass('miying-player')
  player.src = source

  player.on('prev', () => navigateEpisode(-1, player))
  player.on('next', () => navigateEpisode(1, player))
  player.on('timeupdate', () => {
    const context = getPlayContext()
    if (!context) return

    logHis(
      {
        animeName: getSearchName(),
        episodeName: getEpisodeName(),
        id: context.animeId,
        url: window.location.href,
      },
      player.currentTime
    )
  })
}
