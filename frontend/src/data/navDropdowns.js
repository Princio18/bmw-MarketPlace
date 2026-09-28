// Contenus des dropdowns du navbar : les valeurs ici sont des clés i18n
// (résolues par NavDropdown via useTranslation). Un contenu vide ([]) rend
// juste un panneau blanc — à compléter via `navDropdowns.<cle>.groups`.
export const navDropdowns = {
  electric: {
    groups: [
      {
        title: 'navDropdowns.electric.title',
        links: [
          'navDropdowns.electric.el1',
          'navDropdowns.electric.el2',
          'navDropdowns.electric.el3',
          'navDropdowns.electric.el4',
          'navDropdowns.electric.el5',
        ],
      },
      {
        title: 'navDropdowns.charging.title',
        links: [
          'navDropdowns.charging.ch1',
          'navDropdowns.charging.ch2',
          'navDropdowns.charging.ch3',
          'navDropdowns.charging.ch4',
        ],
      },
    ],
  },
  shop: {
    groups: [],
  },
  more: {
    groups: [],
  },
}

export default navDropdowns