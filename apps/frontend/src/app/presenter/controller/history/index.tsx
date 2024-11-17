import './index.css'

import {
  faDownload,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import { createFileRoute } from '@tanstack/react-router'
import { stripVishraams } from 'gurmukhi-utils'
import { useContext, useMemo } from 'react'

import { withNavigationHotkeys } from '#~/components/NavigationHotkeys'
import { HISTORY_DOWNLOAD_URL } from '#~/helpers/consts'
import { HistoryContext } from '#~/helpers/contexts'
import { LINE_HOTKEYS } from '#~/helpers/keyMap'
import { setContent } from '#~/services/content'
import controller from '#~/services/controller'

type HistoryProps = {
  focused?: number,
  register: ( index: number, ref: HTMLElement ) => void,
}

const History = ( { register, focused = 0 }: HistoryProps ) => {
  const { transitionHistory, latestLines } = useContext( HistoryContext )

  return useMemo( () => (
    <List className="history">
      {Object.entries( transitionHistory )
        .sort( ( [ t1 ], [ t2 ] ) => new Date( t2 ).getTime() - new Date( t1 ).getTime() )
        .map( ( [ , {
          timestamp,
          line: { id: lineId, shabadId, gurmukhi },
          bani,
          shabad,
        } ], index ) => {
          const historyId = bani ? bani.id : shabad.id
          const { line: latestLine } = latestLines[ historyId ] || {}

          // Use timestamp to get latest line for that navigation period
          const latestLineId = latestLine ? latestLine.id : lineId

          const onClick = () => ( bani
            ? setContent( { type: 'bani', id: bani.id, lineId: latestLineId } )
            : setContent( { type: 'shabad', id: shabadId, lineId: latestLineId } ) )

          return (
            <ListItem
              className={focused === index ? 'focused' : ''}
              key={timestamp}
              ref={( ref ) => register( index, ref )}
              onClick={onClick}
            >
              <span className="hotkey meta">{LINE_HOTKEYS[ index ]}</span>
              <span className="gurmukhi text">{bani ? bani.nameGurmukhi : stripVishraams( gurmukhi )}</span>
              <span className="timestamp meta">
                {new Date( timestamp ).toLocaleTimeString( navigator.language, { hour: '2-digit', minute: '2-digit', hour12: false } )}
              </span>
            </ListItem>
          )
        } ) }

      <ListItem onClick={() => transitionHistory.length && window.open( HISTORY_DOWNLOAD_URL )}>
        <ListItemIcon className="meta icon">
          <FontAwesomeIcon icon={faDownload} />
        </ListItemIcon>
        Export
      </ListItem>

      <ListItem onClick={controller.clearHistory}>
        <ListItemIcon className="meta icon">
          <FontAwesomeIcon icon={faTrash} />
        </ListItemIcon>
        Clear History
      </ListItem>
    </List>
  ), [ register, focused, transitionHistory, latestLines ] )
}

export const Route = createFileRoute( '/presenter/controller/history/' )( {
  component: withNavigationHotkeys( {
    arrowKeys: true,
    lineKeys: true,
  } )( History ),
} )
