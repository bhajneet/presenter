import { ClientEventParameters } from '@presenter/contract'
import memoize from 'memoizee'
import { invert } from 'radashi'

import { BANIS } from './data'

const isBaniJumpLine = ( baniId, lines ) => (
  { jumpLines },
  { id, lineGroup, gurmukhi },
  index,
) => {
  // Set the jump if it hasn't been set for the line group already
  // eslint-disable-next-line no-unused-vars
  const lineGroupFilter = () => typeof jumpLines[ lineGroup - 1 ] === 'undefined'
  // Set the jump at each line end
  const previousNumberFilter = () => ( index > 0 ? lines[ index - 1 ].gurmukhi.match( /](\d*)]$/ ) : true )

  // Filters for different banis
  const additionalFilters = {
    // Asa Di Vaar
    [ BANIS.ASA_KI_VAAR ]: () => previousNumberFilter() && !gurmukhi.match( /(pauVI ]|mhlw \d* ]|mÚ \d* ])/ ) && id !== '6WX1',
  }

  const filter = additionalFilters[ baniId ] || previousNumberFilter

  return filter()
}

export const getJumpLines = memoize( ( content: ClientEventParameters['content:current'] ) => {
  if ( !content?.lines ) return {}

  // Get a function for determining whether a line is jumpable
  const isJumpLine = content.type === 'bani' ? isBaniJumpLine( content.id, content.lines ) : () => true

  // Go over each line, and tag which lines are jumpable
  const { jumpLines } = lines.reduce( ( { jumpLines, jumpIndex }, line, lineIndex ) => ( {
    // Retain the current jump index and jump lines
    jumpIndex,
    jumpLines,

    // If the current line is jumpable line, add it and move to the next
    ...( isJumpLine( { jumpLines, jumpIndex }, line, lineIndex ) && {
      jumpIndex: jumpIndex + 1,
      jumpLines: { ...jumpLines, [ jumpIndex ]: line.id },
    } ),
  } ), { jumpIndex: 0, jumpLines: {} } )

  return jumpLines
}, {
  primitive: true,
  max: 1,
  normalizer: ( [ content ] ) => JSON.stringify( {
    shabadId: ( content?.type === 'shabad' ? content.shabad.id : null ),
    baniId: ( content?.type === 'bani' ? content.bani.id : null ),
  } ),
} )

export const getBaniNextJumpLine = ( { content, lineId } ) => {
  const { lines } = content

  // Get jump lines and current line index
  const jumpLines = invert( getJumpLines( content ) )
  const currentLineIndex = findLineIndex( lines, lineId )
  const currentLine = lines[ currentLineIndex ]

  // Get next jump line by searching for it from the current line's index
  const nextJumpLineFinder = () => lines.find(
    ( { id } ) => !!jumpLines[ id ],
    Math.min( currentLineIndex + 1, lines.length - 1 ),
  ) || {}

  // Returns a line from the current line's index, based on a regex
  const regexFinder = ( regex: RegExp, forward = true, offset = currentLineIndex ) => {
    const findFn = forward ? lines.indexOf : lines.lastIndexOf

    return findFn( ( { gurmukhi } ) => regex.test( gurmukhi ), offset )
  }

  // Gets the next line after the last pauri
  const asaDiVaarFinder = () => {
    if ( !currentLine ) return null

    // Regexes for catching the end of a section and pauri
    const pauriRegex = /pauVI ]/
    const sectionRegex = /](\d*)]$/

    // Get the start and end indicies of the previous pauri, if any
    const previousPauriStartIndex = regexFinder( pauriRegex, false ) + 1
    const previousPauriEndIndex = regexFinder( sectionRegex, true, previousPauriStartIndex )

    // Get the index of the section after the previous pauri
    const sectionStartIndex = previousPauriStartIndex
      ? regexFinder( sectionRegex, false, currentLineIndex - 1 ) + 1
      : 0

    // A chant begins after a pauri ends
    const inChant = sectionStartIndex === previousPauriEndIndex + 1 || sectionStartIndex === 0
    // A pauri begins if the current section is where the pauri begins
    const inPauri = sectionStartIndex + 1 === previousPauriStartIndex

    // Get the last line in the section
    const sectionEndIndex = previousPauriEndIndex > -1
      ? regexFinder( sectionRegex )
      : lines.length - 1

    // Disable if the current section isn't section after the pauri (the chant) or the pauri section
    if ( !inPauri && !inChant && previousPauriStartIndex !== 0 ) return null

    // If on the pauri title line, jump to the last line of the pauri
    if ( currentLineIndex === previousPauriStartIndex - 1 ) return lines[ sectionEndIndex ]

    if ( inPauri ) {
      // If on the first line in the pauri, jump to the end of the pauri
      if ( previousPauriStartIndex === currentLineIndex ) return lines[ sectionEndIndex ]
      // If on any other line in the pauri, jump to the start of the pauri
      if ( sectionEndIndex >= currentLineIndex ) return lines[ previousPauriStartIndex ]
    }

    if ( inChant ) {
      // If on the first line in the chant section, jump to the end of the section
      if ( sectionStartIndex === currentLineIndex ) return lines[ sectionEndIndex ]
      // If on any other line in the chant section, jump to the first line in the section
      if ( sectionEndIndex >= currentLineIndex ) return lines[ sectionStartIndex ]
    }

    return null
  }

  // Next line jump finder overrides for specific banis
  const additionalFinders = {
    [ BANIS.ASA_KI_VAAR ]: asaDiVaarFinder,
  }

  const findNextJumpLine = additionalFinders[ bani.id ] || nextJumpLineFinder

  const { id: baniNextLineId } = findNextJumpLine() || {}
  return baniNextLineId
}

export const getNextJumpLine = ( { nextLineId, content, lineId } ) => {
  if ( !content ) return null

  return content.type === 'shabad' ? nextLineId : getBaniNextJumpLine( { content, lineId } )
}
