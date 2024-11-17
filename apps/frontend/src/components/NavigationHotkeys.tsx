import { Component, forwardRef, ReactInstance } from 'react'
import { findDOMNode } from 'react-dom'

import { LINE_HOTKEYS } from '#~/helpers/keyMap'
import { debounceHotKey, scrollIntoCenter } from '#~/helpers/utils'

import GlobalHotKeys from './GlobalHotKeys'

const isInput = ( element: Element ) => element instanceof HTMLElement && element.tagName.toLowerCase() === 'input'

const preventDefault = ( fn: ( event: Event ) => any ) => ( event: Event ) => {
  event.preventDefault()
  fn( event )
}

type NavigationHotkeysProps = {
  forwardedRef?: InstanceType<typeof NavigationHotkeys>,
}

type WithNavigationHotkeysProps = {
  arrowKeys?: boolean,
  lineKeys?: boolean,
  clickOnFocus?: boolean,
  keymap?: Keymap,
  wrapAround?: boolean,
}

type Keymap = {
  next: string[],
  previous: string[],
  first: string[] | null,
  last: string[] | null,
}

type State = {
  focusedIndex: number,
}

export const withNavigationHotkeys = ( {
  arrowKeys = true,
  lineKeys,
  clickOnFocus,
  keymap,
  wrapAround = true,
}: WithNavigationHotkeysProps ) => ( WrappedComponent: Component ) => {
  class NavigationHotkeys extends Component<NavigationHotkeysProps, State> {
    nodes: Map<string, ReactInstance>
    handlers: any
    constructor( props: NavigationHotkeysProps ) {
      let newProps = { ...props }

      if ( !props.forwardedRef ) newProps = { ...props, forwardedRef: null }
      super( newProps )

      this.state = { focusedIndex: 0 }

      // Stores the ref to the parent containing the children
      this.nodes = new Map()

      // Generate the handlers in advance
      this.handlers = {
        ...( arrowKeys && this.arrowHandlers ),
        ...( lineKeys && this.lineHandlers ),
      }
    }

    componentDidMount() {
      this.setNodeSize()
      this.setFocus()
    }

    componentDidUpdate( _, { focusedIndex: prevFocusedIndex }: State ) {
      const { focusedIndex } = this.state

      if ( prevFocusedIndex === focusedIndex ) return

      this.setNodeSize()
      this.setFocus()
    }

    setNodeSize = () => this.nodes.forEach( ( value, key ) => ( (
      value || this.nodes.delete( key ) )
    ) )

    setFocus = () => {
      const { focusedIndex } = this.state

      // Find the DOM node for the child to focus, and focus it
      // eslint-disable-next-line react/no-find-dom-node
      const node = findDOMNode( [ ...this.nodes.values() ][ focusedIndex ] )
      if ( node ) scrollIntoCenter( node )
    }

    simulateClick = debounceHotKey( () => {
      const { focusedIndex } = this.state

      // Simulate a click on the focused element if possible
      // eslint-disable-next-line react/no-find-dom-node
      const node = findDOMNode( [ ...this.nodes.values() ][ focusedIndex ] )
      if ( node ) {
        ( node as HTMLElement ).click()
      }
    } )

    jumpToName = ( name: string, click = true ) => this.jumpTo(
      [ ...this.nodes.keys() ].findIndex( ( key ) => key === name ),
      click,
    )

    jumpTo = ( focusedIndex: number, click = true ) => {
      this.setState( { focusedIndex } )

      // Click on navigation if set
      if ( clickOnFocus && click ) {
        this.simulateClick()
      }
    }

    jumpToFirst = () => {
      const index = [ ...this.nodes.values() ].findIndex( ( element ) => !isInput( element ) )

      this.jumpTo( index )
    }

    prevItem = () => {
      const { focusedIndex: prevIndex } = this.state

      if ( !wrapAround && prevIndex === 0 ) return

      // Set the previous focus, with wrap-around
      const focusedIndex = prevIndex > 0 ? prevIndex - 1 : this.nodes.size - 1

      this.jumpTo( focusedIndex )
    }

    nextItem = () => {
      const { focusedIndex: prevIndex } = this.state

      if ( !wrapAround && prevIndex === this.nodes.size - 1 ) return

      // Set the next focus, with wrap-around
      const focusedIndex = prevIndex < this.nodes.size - 1 ? prevIndex + 1 : 0

      this.jumpTo( focusedIndex )
    }

    registerRef = ( name, ref ) => this.nodes.set( name, ref )

    lineHandlers = LINE_HOTKEYS.reduce( ( handlers, key, i ) => ( {
      ...handlers,
      [ key ]: () => this.jumpTo( i ),
    } ), {} )

    arrowHandlers = {
      first: preventDefault( this.jumpToFirst ),
      last: preventDefault( () => this.jumpTo( this.nodes.size - 1 ) ),
      previous: preventDefault( this.prevItem ),
      next: preventDefault( this.nextItem ),
      enter: this.simulateClick,
    }

    keymap = {
      next: [ 'down', 'right', 'tab', 'PageDown', 'l' ],
      previous: [ 'up', 'left', 'shift+tab', 'PageUp', 'j' ],
      ...( !clickOnFocus && { enter: [ 'enter', 'return' ] } ),
      first: [ 'home', 'ctrl+up' ],
      last: [ 'end', 'ctrl+down' ],
      ...( lineKeys && LINE_HOTKEYS.reduce( ( keymap, hotkey ) => ( {
        ...keymap,
        [ hotkey ]: [ hotkey ],
      } ), {} ) ),
      ...keymap,
    }

    render() {
      const { forwardedRef, ...rest } = this.props
      const { focusedIndex } = this.state

      // Get the name of the currently focused element
      const focused = [ ...this.nodes.keys() ][ focusedIndex ]

      return (
        <GlobalHotKeys handlers={this.handlers} keyMap={this.keymap}>
          <WrappedComponent
            {...rest}
            ref={forwardedRef}
            register={this.registerRef}
            updateFocus={this.jumpToName}
            focused={focused}
          />
        </GlobalHotKeys>
      )
    }
  }

  return forwardRef( ( props, ref ) => <NavigationHotkeys {...props} forwardedRef={ref} /> )
}
