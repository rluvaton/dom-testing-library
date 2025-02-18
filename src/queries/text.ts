import {wrapAllByQueryWithSuggestion} from '../query-helpers'
import {checkContainerType} from '../helpers'
import {
  AllByText,
  GetErrorFunction,
  SelectorMatcherOptions,
  Matcher,
} from '../../types'
import {getCachedIsSubtreeInaccessible, isInaccessible} from '../role-helpers'
import {
  fuzzyMatches,
  matches,
  makeNormalizer,
  getNodeText,
  buildQueries,
  getConfig,
} from './all-utils'

const queryAllByText: AllByText = (
  container,
  text,
  {
    selector = '*',
    exact = true,
    collapseWhitespace,
    trim,
    ignore = getConfig().defaultIgnore,
    normalizer,
    excludeHidden = getConfig().defaultExcludeHiddenText,
  } = {},
) => {
  checkContainerType(container)
  const matcher = exact ? matches : fuzzyMatches
  const matchNormalizer = makeNormalizer({collapseWhitespace, trim, normalizer})
  let baseArray: HTMLElement[] = []
  if (typeof container.matches === 'function' && container.matches(selector)) {
    baseArray = [container]
  }
  const cachedIsSubtreeInaccessible = getCachedIsSubtreeInaccessible()

  return (
    [
      ...baseArray,
      ...Array.from(container.querySelectorAll<HTMLElement>(selector)),
    ]
      // TODO: `matches` according lib.dom.d.ts can get only `string` but according our code it can handle also boolean :)
      .filter(node => {
        if (ignore && node.matches(ignore as string)) {
          return false
        }

        if (!excludeHidden) {
          return true
        }

        return !isInaccessible(node, {
          isSubtreeInaccessible: cachedIsSubtreeInaccessible,
        })
      })
      .filter(node => matcher(getNodeText(node), node, text, matchNormalizer))
  )
}

const getMultipleError: GetErrorFunction<[unknown]> = (c, text) =>
  `Found multiple elements with the text: ${text}`
const getMissingError: GetErrorFunction<[Matcher, SelectorMatcherOptions]> = (
  c,
  text,
  options = {},
) => {
  const {collapseWhitespace, trim, normalizer, selector} = options
  const matchNormalizer = makeNormalizer({collapseWhitespace, trim, normalizer})
  const normalizedText = matchNormalizer(text.toString())
  const isNormalizedDifferent = normalizedText !== text.toString()
  const isCustomSelector = (selector ?? '*') !== '*'
  return `Unable to find an element with the text: ${
    isNormalizedDifferent
      ? `${normalizedText} (normalized from '${text}')`
      : text
  }${
    isCustomSelector ? `, which matches selector '${selector}'` : ''
  }. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.`
}

const queryAllByTextWithSuggestions = wrapAllByQueryWithSuggestion<
  // @ts-expect-error -- See `wrapAllByQueryWithSuggestion` Argument constraint comment
  [text: Matcher, options?: MatcherOptions]
>(queryAllByText, queryAllByText.name, 'queryAll')

const [queryByText, getAllByText, getByText, findAllByText, findByText] =
  buildQueries(queryAllByText, getMultipleError, getMissingError)

export {
  queryByText,
  queryAllByTextWithSuggestions as queryAllByText,
  getByText,
  getAllByText,
  findAllByText,
  findByText,
}
