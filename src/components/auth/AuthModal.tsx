import { Modal } from '../ui/Modal'
import { AuthForm } from './AuthForm'

interface Props {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  return (
    <Modal title="Sign in to TimeWise" onClose={onClose}>
      <p className="mb-3 text-xs text-stone-500">
        Your timetable, tasks and study plan sync to your account so they follow you across devices.
      </p>
      <AuthForm onDone={onClose} />
    </Modal>
  )
}
