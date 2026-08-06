import { runtime } from '../../runtime'
import { getAnimeId, getEpisodeName, getSearchName, run } from './play'
import './index.scss'

runtime.register({
  domains: ['danmuhd.com'],
  opts: [
    {
      test: /^\/vodplay\/\d+-\d+-\d+\.html$/,
      run,
    },
  ],
  search: {
    name: '迷影社',
    search: (cn) => `https://danmuhd.com/vodsearch/-------------.html?wd=${cn}`,
    getSearchName,
    getEpisode: getEpisodeName,
    getAnimeScope: getAnimeId,
  },
})
