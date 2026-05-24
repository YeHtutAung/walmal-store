import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ShippingAddress } from '@/types/order'

interface AddressFormProps {
  value: Partial<ShippingAddress>
  onChange: (value: Partial<ShippingAddress>) => void
}

export function AddressForm({ value, onChange }: AddressFormProps) {
  function set(field: keyof ShippingAddress) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [field]: e.target.value })
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="line1">Address line 1 *</Label>
        <Input id="line1" required value={value.line1 ?? ''} onChange={set('line1')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="line2">Address line 2</Label>
        <Input id="line2" value={value.line2 ?? ''} onChange={set('line2')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input id="city" required value={value.city ?? ''} onChange={set('city')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input id="state" required value={value.state ?? ''} onChange={set('state')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code *</Label>
          <Input id="postalCode" required value={value.postalCode ?? ''} onChange={set('postalCode')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input id="country" required value={value.country ?? ''} onChange={set('country')} />
        </div>
      </div>
    </div>
  )
}
