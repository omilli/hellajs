import { mount, html } from "@hellajs/dom";
import { rows, append, clear, create, swap, update, type RowSchema } from "./state.ts";
import { ActionButton } from "./ActionButton.ts";
import { Row } from "./Row.ts";

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
              <${ActionButton} id="run" onClick=${() => create(1000)} text="Create 1,000 rows"/>
              <${ActionButton} id="runlots" onClick=${() => create(10000)} text="Create 10,000 rows"/>
              <${ActionButton} id="add" onClick=${() => append(1000)} text="Append 1,000 rows"/>
              <${ActionButton} id="update" onClick=${update} text="Update every 10th row"/>
              <${ActionButton} id="clear" onClick=${clear} text="Clear"/>
              <${ActionButton} id="swaprows" onClick=${swap} text="Swap Rows"/>
            </div>
          </div>
        </div>
      </div>
      <table class="table table-hover table-striped test-rows">
        <tbody>
          <ForEach for=${rows} each=${(row: RowSchema) => Row({ row })} />
        </tbody>
      </table>
      <span class="preloadicon glyphicon glyphicon-remove" ariaHidden="true"></span>
    </div>
  </div>
`);
