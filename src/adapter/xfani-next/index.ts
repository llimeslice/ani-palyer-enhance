import { runtime } from '../../runtime'
import { getAnimeId, getEpisodeName, getSearchName, run } from './play'
import './index.scss'

runtime.register({
  domains: ['next.xifanacg.com'],
  opts: [
    {
      test: /^\/anime\/\d+\/play\/\d+/,
      run,
    },
  ],
  search: {
    name: '稀饭动漫 Next',
    search: (cn) => `https://next.xifanacg.com/search?q=${cn}`,
    getSearchName,
    getEpisode: getEpisodeName,
    getAnimeScope: getAnimeId,
  },
})
