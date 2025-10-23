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
  url: "https://medieval-source-book.github.io",
  baseurl: "",
  credits: "Design by Mae Velloso-Lyons, courtesy of Digital Humanities Literacy Guidebook, University of Texas at Austin",
  language: "en",
  data: {
    navigation: navigation
  }
};
