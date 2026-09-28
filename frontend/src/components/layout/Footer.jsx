import { FaLinkedinIn, FaYoutube, FaFacebookF, FaInstagram } from 'react-icons/fa6'
import { useTranslation } from 'react-i18next'

const footerLinkKeys = [
  'footer.legalNotice',
  'footer.privacyPolicy',
  'footer.cookiePolicy',
  'footer.compliance',
  'footer.euBattery',
  'footer.sitemap',
]

const socials = [
  { icon: FaLinkedinIn, label: 'LinkedIn' },
  { icon: FaYoutube, label: 'YouTube' },
  { icon: FaFacebookF, label: 'Facebook' },
  { icon: FaInstagram, label: 'Instagram' },
]

function Footer({ noTopBorder = false }) {
  const { t } = useTranslation()
  return (
    <footer
      className={`${
        noTopBorder ? '' : 'border-t border-gray-200 dark:border-gray-800'
      } bg-white dark:bg-gray-950`}
    >
      <div className="flex items-center justify-center gap-5 px-4 pt-[45px] pb-[10px]">
        {socials.map(({ icon: Icon, label }) => (
          <a
            key={label}
            href="#"
            aria-label={label}
            className="text-gray-700 transition hover:text-bmw-blue dark:text-gray-400 dark:hover:text-bmw-blue"
          >
            <Icon size={18} />
          </a>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 border-t border-gray-200 px-4 py-[10px] dark:border-gray-800">
        <span className="font-manrope text-xs leading-none text-gray-700 dark:text-gray-400">
          {t('footer.copyright')}
        </span>
        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
          {footerLinkKeys.map((label) => (
            <li key={label}>
              <a
                href="#"
                className="font-manrope text-xs leading-none text-gray-700 transition hover:text-bmw-blue dark:text-gray-400 dark:hover:text-bmw-blue"
              >
                {t(label)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

export default Footer