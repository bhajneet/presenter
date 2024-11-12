import { stripVishraams, toUnicode } from 'gurmukhi-utils'
import { mapValues } from 'radashi'
import { ReactNode, useContext } from 'react'

import { RecommendedSourcesContext, WritersContext } from '~/helpers/contexts'
import { LANGUAGES, SOURCE_ABBREVIATIONS } from '~/helpers/data'
import { COPY_SHORTCUTS } from '~/helpers/keyMap'
import { customiseLine, getTransliterators } from '~/helpers/line'
import { useCopyToClipboard, useTranslations } from '~/hooks'
import { useContent } from '~/services/content'
import { useLocalSettings } from '~/services/settings'

import GlobalHotKeys from './GlobalHotKeys'

type CopyHotkeysProps = {
  children: ReactNode,
}

const CopyHotkeys = ( { children }: CopyHotkeysProps ) => {
  const [ { hotkeys, lineEnding } ] = useLocalSettings()
  const { lines, line } = useContent()

  // Get Shabad, writer, sources for getting the author
  const writers = useContext( WritersContext )
  const recommendedSources = useContext( RecommendedSourcesContext )

  // Get all translations
  const translations = mapValues(
    useTranslations( [
      LANGUAGES.english,
      LANGUAGES.punjabi,
      LANGUAGES.spanish,
    ] ),
    ( line ) => customiseLine( line, { lineEnding, typeId: line?.typeId } ),
  )

  // Get all transliterators
  const transliterators = mapValues(
    getTransliterators( [
      LANGUAGES.english,
      LANGUAGES.hindi,
      LANGUAGES.urdu,
    ] ),
    ( transliterate ) => () => transliterate(
      customiseLine( line?.gurmukhi, { lineEnding, typeId: line?.typeId } ),
    ),
  )

  const getAuthor = () => {
    if ( !line ) return ''

    const { sourceId, writerId } = content?.type === 'shabad' ? content.shabad : line.shabad
    const { sourcePage } = line

    const { pageNameEnglish: pageName } = recommendedSources[ sourceId ]
    const { nameEnglish: writerName } = writers[ writerId ]

    return `${writerName} - ${SOURCE_ABBREVIATIONS[ sourceId ]} - ${pageName} ${sourcePage}`
  }

  const getAllLines = () => lines?.map( ( { gurmukhi } ) => gurmukhi ).join( ' ' )

  const copyToClipboard = useCopyToClipboard()

  // Generate hotkeys for copying to clipboard
  const hotkeyHandlers = [
    [ COPY_SHORTCUTS.copyGurmukhiAscii.name, () => stripVishraams( line.gurmukhi ), 'gurmukhi' ],
    [ COPY_SHORTCUTS.copyGurmukhiUnicode.name, () => stripVishraams( toUnicode( line.gurmukhi ) ), 'gurmukhi' ],
    [ COPY_SHORTCUTS.copyAllLinesAscii.name, () => stripVishraams( getAllLines() ), 'lines' ],
    [ COPY_SHORTCUTS.copyAllLinesUnicode.name, () => stripVishraams( toUnicode( getAllLines() ) ), 'lines' ],
    [ COPY_SHORTCUTS.copyEnglishTranslation.name, () => translations[ LANGUAGES.english ], 'english translation' ],
    [ COPY_SHORTCUTS.copyPunjabiTranslation.name, () => translations[ LANGUAGES.punjabi ], 'punjabi translation' ],
    [ COPY_SHORTCUTS.copySpanishTranslation.name, () => translations[ LANGUAGES.spanish ], 'spanish translation' ],
    [ COPY_SHORTCUTS.copyEnglishTransliteration.name, () => stripVishraams( transliterators[ LANGUAGES.english ]() ), 'english transliteration' ],
    [ COPY_SHORTCUTS.copyHindiTransliteration.name, () => stripVishraams( transliterators[ LANGUAGES.hindi ]() ), 'hindi transliteration' ],
    [ COPY_SHORTCUTS.copyUrduTransliteration.name, () => stripVishraams( transliterators[ LANGUAGES.urdu ]() ), 'urdu transliteration' ],
    [ COPY_SHORTCUTS.copyCitation.name, () => getAuthor(), 'citation' ],
  ].reduce( ( hotkeys, [ name, getContent, fieldName ] ) => ( {
    ...hotkeys,
    [ name ]: () => copyToClipboard( line && getContent(), `No ${fieldName} available to copy` ),
  } ), {} )
  return (
    <GlobalHotKeys keyMap={hotkeys} handlers={hotkeyHandlers}>
      {children}
    </GlobalHotKeys>
  )
}

export default CopyHotkeys
