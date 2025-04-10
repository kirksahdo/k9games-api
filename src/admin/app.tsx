import Logo from "./extensions/logo.png";

export default {
  config: {
    auth: {
      logo: Logo,
    },
    head: {
      favicon: Logo,
    },
    locales: [],
    menu: {
      logo: Logo,
    },
    translations: {
      en: {
        "Auth.form.welcome.title": "Welcome to K9 Games!",
        "Auth.form.welcome.subtitle": "Login to your acoount",
        "app.components.LeftMenu.navbrand.title": "Dashboard",
        "HomePage.head.title": "Homepage | K9 Games",
      },
    },
    theme: {
      light: {},
      dark: {
        colors: {
          primary100: "#030415",
          primary600: "#f231a5",
          primary700: "#f231a5",
          neutral0: "#0d102f",
          neutral100: "#030415",
        },
      },
    },
  },
  bootstrap() {},
};
