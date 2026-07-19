import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Avatar, type AvatarProps } from '../avatar'

export interface UserProps extends HTMLAttributes<HTMLDivElement> {
  avatarProps?: AvatarProps
  description?: ReactNode
  name: ReactNode
}

export const User = forwardRef<HTMLDivElement, UserProps>(function User(
  { avatarProps, className, description, name, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={['ods-user', className].filter(Boolean).join(' ')}
      data-slot="user"
      ref={ref}
    >
      <Avatar size="md" {...avatarProps} />
      <span className="ods-user__info" data-slot="info">
        <span className="ods-user__name" data-slot="name">
          {name}
        </span>
        {description ? (
          <span className="ods-user__description" data-slot="description">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  )
})
