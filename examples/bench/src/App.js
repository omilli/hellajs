import { mount, html, ForEach, Lazy } from "@hellajs/dom";
import { rows, append, clear, create, swap, update } from "./state.js";
import { Row } from "./Row.js";

const ActionButton = ({ props }) => Lazy({
  loader: () => import("./ActionButton.js").then(m => m.ActionButton),
  props
});

mount(html`
  <div id="main">
    <div class="container">
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>HellaJS Keyed</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <${ActionButton}
                props=${{ id: "run", onClick: () => create(1000), text: "Create 1,000 rows" }}
              />
              <${ActionButton}
                props=${{ id: "runlots", onClick: () => create(10000), text: "Create 10,000 rows" }}
              />
              <${ActionButton}
                props=${{ id: "add", onClick: () => append(1000), text: "Append 1,000 rows" }}
              />
              <${ActionButton}
                props=${{ id: "update", onClick: update, text: "Update every 10th row" }}
              />
              <${ActionButton}
                props=${{ id: "clear", onClick: clear, text: "Clear" }}
              />
              <${ActionButton}
                props=${{ id: "swaprows", onClick: swap, text: "Swap Rows" }}
              />
            </div>
          </div>
        </div>
      </div>
      <table class="table table-hover table-striped test-rows">
        <tbody>
          <${ForEach} each=${rows} use=${(row) => Row(row)} />
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" ariaHidden="true"></span>
    </div>
  </div>
`);
