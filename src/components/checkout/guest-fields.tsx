import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GuestFieldsProps {
  email: string
  onChange: (email: string) => void
}

export function GuestFields({ email, onChange }: GuestFieldsProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="guestEmail">Email address *</Label>
      <Input
        id="guestEmail"
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Your order confirmation will be sent to this address.
      </p>
    </div>
  )
}
