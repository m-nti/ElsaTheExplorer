<script lang="ts">
  // Der Katalog does not belong in a script comment.
  const copy = { de: "Der Katalog does not belong in a script literal." };
</SCRIPT>

<main class="katalog-grid" id="katalog-liste">
  <h1>Der Katalog ist kein Name mehr</h1>
  <p>The Catalogue is not the name.</p>
  <img
    src="/karte.webp"
    alt="Kartenkatalog der Hündin"
  />
  <button aria-label="Katalog öffnen" type="button">Öffnen</button>
  <span title="Katalog">Karte</span>
  <input placeholder="Katalog durchsuchen" />
</main>

<style>
  .katalog-grid::after {
    content: "Der Katalog does not belong in a stylesheet.";
  }
</style>

<!-- Der Katalog does not belong in a comment. -->
<p>Der Katalog bleibt verboten.</p>
