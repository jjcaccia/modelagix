/**
 * MODELAGIX — le témoin de santé des volumes
 *
 * Un fichier 3D défectueux s'affiche parfaitement et refuse de s'imprimer. Le
 * défaut est invisible : l'élève ne peut pas le voir, donc il ne peut pas le
 * chercher. Il découvrira le problème devant l'imprimante, c'est-à-dire trop
 * tard, et sans rien pour comprendre.
 *
 * D'où ce témoin, en bas à droite, au-dessus du décompte des sommets. Il
 * n'apparaît QUE lorsqu'il y a quelque chose à dire — un témoin toujours
 * allumé cesse d'être lu au bout de dix minutes. Un clic ouvre le détail et
 * propose la réparation.
 *
 * ── Quand l'examen a lieu ─────────────────────────────────────────────────
 *
 * À chaque changement d'état annoncé par la façade, mais pas plus d'une fois
 * par seconde, et seulement si le nombre de sommets ou de faces a bougé depuis
 * le dernier examen. Sculpter en détail dynamique change ces nombres à chaque
 * coup de pinceau : sans ce garde-fou, on relancerait l'examen des centaines de
 * fois par minute.
 *
 * L'examen lui-même est un seul parcours du tableau des arêtes — c'est le
 * comptage des BOUCLES qui coûte, et il n'a lieu que si des bords libres ont
 * effectivement été trouvés.
 */

import Icones from 'modelagix/Icones';

var ID_STYLE = 'modelagix-style-temoin';
/** Délai minimal entre deux examens, en millisecondes. */
var REPOS = 1000;

var CSS = [
  '.modelagix-temoin {',
  '  position: fixed;',
  '  z-index: 11;',
  '  right: 28px;',
  // Au-dessus du décompte des sommets, qui occupe déjà l'angle.
  '  bottom: 52px;',
  '  display: none;',
  '  align-items: center;',
  '  gap: 7px;',
  '  padding: 6px 11px 6px 8px;',
  '  border: none;',
  '  border-radius: 8px;',
  // L'ambre plutôt que le rouge : ce n'est pas une erreur de l'utilisateur, et
  // rien n'est perdu. C'est un avertissement, et il doit se lire comme tel.
  '  background: rgba(214, 158, 46, 0.18);',
  '  color: #e8c07a;',
  '  font: 600 12px/1 system-ui, -apple-system, sans-serif;',
  '  white-space: nowrap;',
  '  cursor: pointer;',
  '  transition: background 120ms ease;',
  '}',
  '.modelagix-temoin.visible {',
  '  display: flex;',
  '}',
  '.modelagix-temoin:hover {',
  '  background: rgba(214, 158, 46, 0.30);',
  '}',
  '.modelagix-temoin .modelagix-icone {',
  '  width: 19px;',
  '  height: 19px;',
  '}',
  // ── Le détail, ouvert au clic ───────────────────────────────────────
  '.modelagix-temoin-detail {',
  '  position: fixed;',
  '  z-index: 12;',
  '  right: 28px;',
  '  bottom: 92px;',
  '  width: 310px;',
  '  padding: 14px 16px;',
  '  border-radius: 10px;',
  '  background: rgba(36, 41, 48, 0.97);',
  '  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5);',
  '  color: rgba(255, 255, 255, 0.82);',
  '  font: 12px/1.45 system-ui, -apple-system, sans-serif;',
  '}',
  '.modelagix-temoin-detail h3 {',
  '  margin: 0 0 8px;',
  '  color: #e8c07a;',
  '  font-size: 12px;',
  '  font-weight: 600;',
  '}',
  '.modelagix-temoin-detail p {',
  '  margin: 0 0 10px;',
  '}',
  '.modelagix-temoin-detail .doux {',
  '  color: rgba(255, 255, 255, 0.50);',
  '}',
  '.modelagix-temoin-detail button {',
  '  width: 100%;',
  '  padding: 8px;',
  '  border: none;',
  '  border-radius: 6px;',
  '  background: rgba(110, 168, 254, 0.26);',
  '  color: #cfe0ff;',
  '  font: 600 12px system-ui, -apple-system, sans-serif;',
  '  cursor: pointer;',
  '}',
  '.modelagix-temoin-detail button:hover {',
  '  background: rgba(110, 168, 254, 0.40);',
  '}',
  '.modelagix-temoin-detail button:disabled {',
  '  background: rgba(255, 255, 255, 0.07);',
  '  color: rgba(255, 255, 255, 0.35);',
  '  cursor: default;',
  '}'
].join('\n');

class TemoinSante {

  constructor(facade) {
    this._facade = facade;
    this._dernierExamen = 0;
    this._derniereTaille = null;
    this._bilan = null;
    this._detail = null;

    this._injecterStyle();
    this._construire();

    facade.onChange(this._peutEtreExaminer.bind(this));
    // Le premier maillage n'est pas encore posé quand la façade se construit.
    window.setTimeout(this._examiner.bind(this), 400);
  }

  _injecterStyle() {
    if (document.getElementById(ID_STYLE)) return;
    var style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  _construire() {
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'modelagix-temoin';
    bouton.innerHTML = Icones.baliser('alerte') + '<span class="texte"></span>';
    bouton.addEventListener('click', this._basculerDetail.bind(this), false);
    document.body.appendChild(bouton);
    this._bouton = bouton;
    this._texte = bouton.querySelector('.texte');
  }

  // -----------------------------------------------------------------
  //  Examen
  // -----------------------------------------------------------------

  /**
   * Examen si — et seulement si — la géométrie a changé et que le précédent
   * est assez ancien. Sculpter en détail dynamique appelle cette méthode à
   * chaque coup de pinceau.
   */
  _peutEtreExaminer() {
    var maintenant = window.performance ? window.performance.now() : 0;
    if (maintenant - this._dernierExamen < REPOS) return;

    var taille = this._facade.sceneSize();
    if (taille === this._derniereTaille) return;

    this._examiner();
  }

  _examiner() {
    this._dernierExamen = window.performance ? window.performance.now() : 0;
    this._derniereTaille = this._facade.sceneSize();

    var bilan = this._facade.diagnoseScene();
    this._bilan = bilan;
    this._afficher(bilan);
    if (this._detail) this._remplirDetail();
  }

  _afficher(bilan) {
    this._bouton.classList.toggle('visible', !bilan.sain);
    if (bilan.sain) {
      this._fermerDetail();
      return;
    }
    var mots = [];
    if (bilan.trous > 0) {
      mots.push(bilan.trous + (bilan.trous > 1 ? ' trous' : ' trou'));
    }
    if (bilan.aretesSurchargees > 0) {
      mots.push(bilan.aretesSurchargees + ' arête' +
        (bilan.aretesSurchargees > 1 ? 's' : '') + ' en trop');
    }
    this._texte.textContent = mots.join(', ');
    this._bouton.title = 'Cliquer pour en savoir plus et réparer';
  }

  // -----------------------------------------------------------------
  //  Le détail
  // -----------------------------------------------------------------

  _basculerDetail() {
    if (this._detail) return this._fermerDetail();

    this._detail = document.createElement('div');
    this._detail.className = 'modelagix-temoin-detail';
    document.body.appendChild(this._detail);
    this._remplirDetail();

    this._cbFermer = function (ev) {
      if (ev.type === 'keydown' && ev.key !== 'Escape') return;
      if (ev.type === 'mousedown' &&
        (this._detail.contains(ev.target) || this._bouton.contains(ev.target))) return;
      this._fermerDetail();
    }.bind(this);
    // À la capture : le moteur arrête la propagation du clic dans la zone de
    // dessin, et le panneau y resterait ouvert.
    window.setTimeout(function () {
      window.addEventListener('mousedown', this._cbFermer, true);
      window.addEventListener('keydown', this._cbFermer, true);
    }.bind(this), 0);
  }

  _fermerDetail() {
    if (!this._detail) return;
    window.removeEventListener('mousedown', this._cbFermer, true);
    window.removeEventListener('keydown', this._cbFermer, true);
    if (this._detail.parentNode) this._detail.parentNode.removeChild(this._detail);
    this._detail = null;
  }

  /**
   * Le texte du panneau.
   *
   * Il explique ce qui se passe AVANT de proposer le remède. Un bouton
   * « Réparer » seul apprendrait à cliquer sans comprendre, ce qui est
   * exactement l'inverse de ce qu'on veut ici.
   */
  _remplirDetail() {
    var bilan = this._bilan;
    if (!this._detail || !bilan) return;

    var html = '<h3>Ces volumes ne sont pas fermés</h3>';

    if (bilan.trous > 0) {
      html += '<p><strong>' + bilan.trous +
        (bilan.trous > 1 ? ' trous</strong> percent' : ' trou</strong> perce') +
        ' la surface. Un objet troué s\'affiche très bien à l\'écran, mais une ' +
        'imprimante 3D ne sait pas quoi remplir : elle a besoin d\'un intérieur ' +
        'et d\'un extérieur.</p>';
    }

    if (bilan.aretesSurchargees > 0) {
      html += '<p><strong>' + bilan.aretesSurchargees + ' arête' +
        (bilan.aretesSurchargees > 1 ? 's</strong> portent' : '</strong> porte') +
        ' plus de deux faces : deux morceaux de matière s\'y rejoignent comme ' +
        'les pages d\'un livre. Aucun objet réel ne fait cela.</p>' +
        '<p class="doux">Celles-là ne se réparent pas toutes seules : il faudrait ' +
        'décider quelle partie garder, et c\'est un choix de forme.</p>';
    }

    html += '<button type="button"' + (bilan.trous > 0 ? '' : ' disabled') + '>' +
      (bilan.trous > 0 ? 'Reboucher les trous' : 'Rien à reboucher') + '</button>';

    this._detail.innerHTML = html;
    var bouton = this._detail.querySelector('button');
    if (bouton && bilan.trous > 0) {
      bouton.addEventListener('click', this._reparer.bind(this), false);
    }
  }

  _reparer() {
    this._facade.repairScene();
    this._fermerDetail();
    this._examiner();
  }
}

export default TemoinSante;
