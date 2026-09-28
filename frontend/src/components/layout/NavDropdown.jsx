import { useTranslation } from 'react-i18next'

function NavDropdown({ open, groups = [], onClose }) {
  const { t } = useTranslation()
  return (
    <div
      className={`absolute inset-x-0 top-full z-10 h-[75vh] w-full overflow-y-auto bg-white transition-transform duration-500 ease-out ${
        open
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-full opacity-0'
      }`}
    >
      {groups.length > 0 && (
        <div className="mx-auto w-full max-w-[1280px] px-6 py-10 md:px-20 md:py-14">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="font-manrope text-[11px] font-semibold uppercase tracking-wide text-gray-900">
                  {t(group.title)}
                </h3>
                <ul className="font-manrope mt-4 space-y-3">
                  {group.links.map((label) => (
                    <li key={label}>
                      <a
                        href="#"
                        onClick={onClose}
                        className="text-sm text-gray-600 transition hover:text-bmw-blue"
                      >
                        {t(label)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NavDropdown