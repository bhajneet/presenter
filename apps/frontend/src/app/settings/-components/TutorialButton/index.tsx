import './index.css'

import classNames from 'classnames'

import controller from '#~/services/controller'

import { Button } from '../SettingsComponents'

type TutorialButtonProps = {
  href?: string,
  children?: React.ReactNode,
  className?: string | null,
}

const TutorialButton = ( { className = null, href = '', children = null, ...props }: TutorialButtonProps ) => (
  <Button
    className={classNames( className, 'tutorial-button' )}
    onClick={() => controller.openExternalUrl( href )}
    {...props}
  >
    {children}
  </Button>
)

export default TutorialButton
