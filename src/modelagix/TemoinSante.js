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

// ── Un nom de classe déjà pris ─────────────────────────────────────────────
// Ce fichier s'appelait d'abord ses éléments `.modelagix-temoin`. Or la barre
// des paramètres appelle ainsi, depuis bien plus longtemps, le disque qui
// montre l'empreinte du pinceau. Les règles écrites ici — `position: fixed`,
// `display: none` — se sont donc appliquées à lui, et il a disparu de la barre
// sans que rien ne le signale : aucune erreur, juste un élément en moins.
//
// D'où `.modelagix-sante`. Avant d'inventer un nom de classe, chercher s'il
// existe déjà : une feuille de style ne prévient jamais des collisions.

var ID_STYLE = 'modelagix-style-sante';
/** Délai minimal entre deux examens, en millisecondes. */
var REPOS = 1000;

var CSS = [
  '.modelagix-sante {',
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
  '.modelagix-sante.visible {',
  '  display: flex;',
  '}',
  '.modelagix-sante:hover {',
  '  background: rgba(214, 158, 46, 0.30);',
  '}',
  '.modelagix-sante .modelagix-icone {',
  '  width: 19px;',
  '  height: 19px;',
  '}',
  // ── Le détail, ouvert au clic ───────────────────────────────────────
  '.modelagix-sante-detail {',
  '  position: fixed;',
  '  z-index: 12;',
  '  right: 28px;',
  '  bottom: 92px;',
  '  width: 310px;',
  // Le panneau grandit avec le nombre de défauts : six paragraphes et deux
  // boutons dépassaient le haut de la fenêtre, et le titre devenait invisible.
  '  max-height: calc(100vh - 130px);',
  '  overflow-y: auto;',
  '  scrollbar-width: thin;',
  '  scrollbar-color: rgba(255,255,255,0.18) transparent;',
  '  padding: 14px 16px;',
  '  border-radius: 10px;',
  '  background: rgba(36, 41, 48, 0.97);',
  '  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5);',
  '  color: rgba(255, 255, 255, 0.82);',
  '  font: 12px/1.45 system-ui, -apple-system, sans-serif;',
  '}',
  '.modelagix-sante-detail h3 {',
  '  margin: 0 0 8px;',
  '  color: #e8c07a;',
  '  font-size: 12px;',
  '  font-weight: 600;',
  '}',
  '.modelagix-sante-detail p {',
  '  margin: 0 0 10px;',
  '}',
  '.modelagix-sante-detail .doux {',
  '  color: rgba(255, 255, 255, 0.50);',
  '}',
  '.modelagix-sante-detail button {',
  '  display: block;',
  '  width: 100%;',
  '  margin-top: 6px;',
  '  padding: 8px;',
  '  border: none;',
  '  border-radius: 6px;',
  '  background: rgba(110, 168, 254, 0.26);',
  '  color: #cfe0ff;',
  '  font: 600 12px system-ui, -apple-system, sans-serif;',
  '  cursor: pointer;',
  '}',
  '.modelagix-sante-detail button:hover {',
  '  background: rgba(110, 168, 254, 0.40);',
  '}',
  '.modelagix-sante-detail button:disabled {',
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

    var verifier = this._peutEtreExaminer.bind(this);
    facade.onChange(verifier);
    // ── Et surtout : à chaque relâchement de souris ──────────────────────
    //
    // `onChange` ne se déclenche QUE sur un changement de réglage — outil,
    // taille, symétrie. Modeler ne prévient personne : la façade n'est pas
    // dans la boucle du pinceau. La surveillance ne se relançait donc jamais
    // pendant qu'on sculptait, ce qui est exactement le moment où les défauts
    // apparaissent. C'est la cause du témoin qui restait muet.
    //
    // Le relâchement de la souris marque la fin d'un geste : le bon moment,
    // et pas un de plus.
    window.addEventListener('mouseup', verifier, false);

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
    bouton.className = 'modelagix-sante';
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
    if (bilan.morceauxEnTrop > 0) {
      mots.push((bilan.morceauxEnTrop + 1) + ' morceaux');
    }
    if (bilan.aiguilles > 0) {
      mots.push(bilan.aiguilles + ' éclat' + (bilan.aiguilles > 1 ? 's' : ''));
    }
    if (bilan.paroisMinces) {
      mots.push('parois minces');
    }
    if (bilan.intersections) {
      mots.push('pénétrations');
    }
    if (bilan.aretesSurchargees > 0) {
      mots.push(bilan.aretesSurchargees + ' arête' +
        (bilan.aretesSurchargees > 1 ? 's' : '') + ' en trop');
    }
    // Au-delà de deux défauts, l'énumération devient plus longue que large et
    // finit par sortir de l'écran. Le témoin n'a pas à tout dire : il a à faire
    // ouvrir le panneau, qui le dira.
    this._texte.textContent = mots.length > 2
      ? mots.length + ' problèmes'
      : mots.join(', ');
    this._bouton.title = 'Cliquer pour en savoir plus et réparer';
  }

  // -----------------------------------------------------------------
  //  Le détail
  // -----------------------------------------------------------------

  _basculerDetail() {
    if (this._detail) return this._fermerDetail();

    this._detail = document.createElement('div');
    this._detail.className = 'modelagix-sante-detail';
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

    if (bilan.morceauxEnTrop > 0) {
      html += '<p>La forme est en <strong>' + (bilan.morceauxEnTrop + 1) +
        ' morceaux séparés</strong> qui ne se touchent plus. À l\'écran ils se ' +
        'confondent avec le reste ; à l\'impression, ils tombent.</p>';
    }

    if (bilan.aiguilles > 0) {
      html += '<p><strong>' + bilan.aiguilles + ' éclat' +
        (bilan.aiguilles > 1 ? 's</strong> sont' : '</strong> est') +
        ' réduit' + (bilan.aiguilles > 1 ? 's' : '') + ' à des aiguilles ou des ' +
        'lamelles sans épaisseur. Une imprimante ne peut rien en faire.</p>';
    }

    if (bilan.paroisMinces) {
      var pourMille = Math.round(bilan.epaisseurMinimale * 1000);
      html += '<p>La matière descend à <strong>' + (pourMille / 10) +
        ' % de la taille de l\'objet</strong> par endroits — sur une pièce de ' +
        '10 cm, moins d\'un millimètre. Une imprimante ne tient pas une paroi ' +
        'aussi fine : elle la rate, ou la pièce casse.</p>';
    }

    if (bilan.intersections) {
      html += '<p>Des parties du volume <strong>se traversent</strong>. La ' +
        'surface a beau être fermée, l\'objet n\'a plus d\'intérieur défini : ' +
        'la machine ne sait plus ce qui est plein et ce qui est vide.</p>';
    }

    if (bilan.aretesSurchargees > 0) {
      html += '<p><strong>' + bilan.aretesSurchargees + ' arête' +
        (bilan.aretesSurchargees > 1 ? 's</strong> portent' : '</strong> porte') +
        ' plus de deux faces : deux morceaux de matière s\'y rejoignent comme ' +
        'les pages d\'un livre. Aucun objet réel ne fait cela.</p>';
    }

    // Deux remèdes de portée très différente, et l'ordre compte : le
    // chirurgical d'abord, celui du dernier recours ensuite, avec ce qu'il
    // coûte écrit juste au-dessus.
    if (bilan.trous > 0) {
      html += '<button type="button" data-remede="boucher">Reboucher les trous</button>';
    }

    var resteQuelqueChose = bilan.morceauxEnTrop > 0 || bilan.aiguilles > 0 ||
      bilan.aretesSurchargees > 0 || bilan.paroisMinces || bilan.intersections;
    if (resteQuelqueChose) {
      html += '<p class="doux" style="margin:10px 0 6px">Le reste ne se répare pas ' +
        'point par point. <strong>Refondre</strong> reconstruit une surface propre ' +
        'à partir du volume occupé : les pénétrations, les éclats et les arêtes ' +
        'en trop disparaissent, et les morceaux qui se touchent fusionnent. En ' +
        'échange, le détail fin ne survit pas.</p>';
      if (bilan.morceauxEnTrop > 0) {
        // Dit avant d'agir, pas découvert après : refondre ne soude pas ce qui
        // ne se touche pas, et l'utilisateur doit le savoir avant de perdre son
        // détail pour rien.
        html += '<p class="doux" style="margin:0 0 6px">Les morceaux vraiment ' +
          'séparés le resteront : on ne soude pas ce qui ne se touche pas. Il ' +
          'faut les rapprocher, ou les supprimer.</p>';
      }
      if (bilan.paroisMinces) {
        html += '<p class="doux" style="margin:0 0 6px">Une paroi trop mince ne ' +
          's\'épaissit pas toute seule non plus : refondre la lissera, ou la ' +
          'fera disparaître. Il faut y remettre de la matière.</p>';
      }
      html += '<button type="button" data-remede="refondre">Refondre le volume</button>';
    }

    html += '<p class="doux" style="margin:10px 0 0">' +
      (bilan.densite && bilan.densite < 1
        ? 'Surveillance en cours de modelage : sondages allégés. Pour un examen ' +
          'complet, le bouton « Vérifier et réparer » du groupe SCÈNE.'
        : 'Examen complet. Un sondage montre un défaut ; il ne garantit pas ' +
          'qu\'il n\'y en a aucun autre ailleurs.') + '</p>';

    this._detail.innerHTML = html;
    var self = this;
    var boutons = this._detail.querySelectorAll('button');
    for (var i = 0; i < boutons.length; ++i) {
      boutons[i].addEventListener('click', function () {
        self._appliquer(this.getAttribute('data-remede'));
      }, false);
    }
  }

  /**
   * Affiche un bilan venu d'ailleurs — celui de l'examen approfondi.
   *
   * Il ne devient pas la référence permanente : la prochaine surveillance
   * automatique le remplacera par un bilan ordinaire, et le panneau redira que
   * les parois n'ont pas été regardées. C'est voulu : la géométrie aura changé,
   * et un résultat de sondage périmé vaudrait moins que pas de résultat.
   */
  montrer(bilan) {
    this._bilan = bilan;
    this._afficher(bilan);
    if (this._detail) this._remplirDetail();
  }

  _appliquer(remede) {
    if (remede === 'refondre') this._facade.remeltScene();
    else this._facade.repairScene();
    this._fermerDetail();
    this._examiner();
  }
}

export default TemoinSante;
