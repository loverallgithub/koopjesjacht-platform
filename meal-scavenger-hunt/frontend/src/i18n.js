import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      welcome: 'Welcome to Koopjesjacht',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',

      // Navigation
      home: 'Home',
      hunts: 'Hunts',
      profile: 'Profile',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',

      // Hunts
      browseHunts: 'Browse Hunts',
      joinHunt: 'Join Hunt',
      myHunts: 'My Hunts',
      activeHunts: 'Active Hunts',

      // Teams
      team: 'Team',
      teams: 'Teams',
      createTeam: 'Create Team',
      myTeam: 'My Team',

      // Common actions
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      continue: 'Continue',

      // Form labels
      email: 'Email',
      password: 'Password',
      name: 'Name',
      phone: 'Phone',

      // Validation
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      passwordTooShort: 'Password must be at least 8 characters',
    },
  },
  nl: {
    translation: {
      // Common
      welcome: 'Welkom bij Koopjesjacht',
      loading: 'Laden...',
      error: 'Er is een fout opgetreden',
      success: 'Succes',

      // Navigation
      home: 'Home',
      hunts: 'Speurtochten',
      profile: 'Profiel',
      login: 'Inloggen',
      register: 'Registreren',
      logout: 'Uitloggen',

      // Hunts
      browseHunts: 'Speurtochten Bekijken',
      joinHunt: 'Deelnemen',
      myHunts: 'Mijn Speurtochten',
      activeHunts: 'Actieve Speurtochten',

      // Teams
      team: 'Team',
      teams: 'Teams',
      createTeam: 'Team Maken',
      myTeam: 'Mijn Team',

      // Common actions
      submit: 'Verzenden',
      cancel: 'Annuleren',
      save: 'Opslaan',
      delete: 'Verwijderen',
      edit: 'Bewerken',
      back: 'Terug',
      next: 'Volgende',
      continue: 'Doorgaan',

      // Form labels
      email: 'E-mail',
      password: 'Wachtwoord',
      name: 'Naam',
      phone: 'Telefoon',

      // Validation
      required: 'Dit veld is verplicht',
      invalidEmail: 'Ongeldig e-mailadres',
      passwordTooShort: 'Wachtwoord moet minimaal 8 tekens zijn',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
