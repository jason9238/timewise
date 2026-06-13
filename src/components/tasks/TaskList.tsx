import type { Task } from '../../types'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: Task[]
  emptyMessage?: string
}

export function TaskList({ tasks, emptyMessage = 'No tasks yet.' }: Props) {
  if (tasks.length === 0) {
    return <p className="rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-sm text-stone-400">{emptyMessage}</p>
  }
  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    return a.createdAt - b.createdAt
  })
  return (
    <ul className="space-y-1.5">
      {sorted.map((task) => (
        <li key={task.id}>
          <TaskItem task={task} />
        </li>
      ))}
    </ul>
  )
}
