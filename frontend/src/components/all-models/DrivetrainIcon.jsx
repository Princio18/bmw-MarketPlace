import { Flame, FlaskConical, Fuel, Leaf, Shield, Zap } from 'lucide-react'

const DRIVETRAIN_ICONS = {
  electric: Zap,
  hybrid: Leaf,
  petrol: Flame,
  diesel: Fuel,
  concept: FlaskConical,
  protection: Shield,
}

function DrivetrainIcon({ drivetrain, size = 16, className = '' }) {
  const Icon = DRIVETRAIN_ICONS[drivetrain] || Zap
  return <Icon size={size} className={className} aria-hidden="true" />
}

export default DrivetrainIcon