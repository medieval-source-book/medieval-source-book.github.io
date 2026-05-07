const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Read navigation.yml and make it available as site.data.navigation
// This mimics Jekyll's site.data structure for template compatibility
const navigationYml = fs.readFileSync(path.join(__dirname, 'navigation.yml'), 'utf8');
const navigation = yaml.load(navigationYml);

module.exports = {
  title: "Global Medieval Sourcebook",
  sitetitle: "Global Medieval Sourcebook",
  slogan: "A Digital Repository of Medieval Texts",
  url: "https://sourcebook.stanford.edu",
  baseurl: "",
  credits: "Created by Kathryn Starkey, Mae Velloso-Lyons, and Quinn Daedal",
  language: "en",
  data: {
    navigation: navigation
  }
};
