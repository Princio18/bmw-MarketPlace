import Hero from '../components/home/Hero'
import NewOfferBanner from '../components/home/NewOfferBanner'
import OfferBanner from '../components/home/OfferBanner'
import OwnerDirectoryBanner from '../components/home/OwnerDirectoryBanner'
import Footer from '../components/layout/Footer'
import Navbar from '../components/layout/Navbar'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'

function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <OfferBanner />
      <NewOfferBanner />
      <OwnerDirectoryBanner />
      <Footer />
      <ScrollToTopButton />
    </>
  )
}

export default Home