import VehicleCard from './VehicleCard'
import ExpandedVehiclePanel from './ExpandedVehiclePanel'

const ROW_SIZE = 3

function VehicleGrid({ vehicles, expandedId, onToggle }) {
  const rows = []
  for (let i = 0; i < vehicles.length; i += ROW_SIZE) {
    rows.push(vehicles.slice(i, i + ROW_SIZE))
  }

  return (
    <>
      {rows.map((row) => {
        const expandedVehicle = row.find((vehicle) => vehicle.id === expandedId) || null
        return (
          <div key={row[0].id} className="mb-6 last:mb-0">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {row.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  expanded={expandedId === vehicle.id}
                  onToggle={() => onToggle(vehicle.id)}
                />
              ))}
            </div>
            {expandedVehicle && (
              <div className="mt-6">
                <ExpandedVehiclePanel vehicle={expandedVehicle} />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

export default VehicleGrid