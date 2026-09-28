import { useTranslation } from 'react-i18next'
import headlineImage from '../../assets/images/Headline_image_v2_3to1.webp'

function OfferBanner() {
  const { t } = useTranslation()
  return (
    <section className="relative mb-3 h-[396px] w-full overflow-hidden md:h-[496px]">
      <img
        src={headlineImage}
        alt={t('banners.offer.imgAlt')}
        className="absolute inset-0 z-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/90 via-black/50 via-[35%] to-transparent to-[65%]" />

      <div className="relative z-20 flex h-full max-w-lg flex-col justify-end px-6 pb-8 text-white md:px-20">
        <h2 className="font-manrope text-2xl font-extralight leading-tight tracking-tight md:text-4xl">
          {t('banners.offer.title1')}
          <br />
          {t('banners.offer.title2')}
        </h2>
        <p className="font-manrope mt-4 max-w-md text-sm font-normal leading-relaxed md:text-base">
          {t('banners.offer.p1')} {t('banners.offer.p2')}
        </p>
        <div className="mt-6 flex flex-wrap gap-4 md:mt-8">
          <a
            href="#"
            className="rounded-sm bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            {t('common.discoverNow')}
          </a>
          <a
            href="#"
            className="rounded-sm border border-white px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-black"
          >
            {t('common.requestAnOffer')}
          </a>
        </div>
      </div>
    </section>
  )
}

export default OfferBanner