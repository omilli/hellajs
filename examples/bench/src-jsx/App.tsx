import { mount, ForEach } from "@hellajs/dom";
import { rows, append, clear, create, swap, update, RowSchema } from "./state";
import { ActionButton } from "./ActionButton";
import { Row } from "./Row";

mount(<div id="main">
  <div class="container">
    <div class="jumbotron">
      <div class="row">
        <div class="col-md-6">
          <h1>HellaJS Keyed</h1>
        </div>
        <div class="col-md-6">
          <div class="row">
            <ActionButton id="run" onClick={() => create(1000)} text="Create 1,000 rows" />
            <ActionButton id="runlots" onClick={() => create(10000)} text="Create 10,000 rows" />
            <ActionButton id="add" onClick={() => append(1000)} text="Append 1,000 rows" />
            <ActionButton id="update" onClick={update} text="Update every 10th row" />
            <ActionButton id="clear" onClick={clear} text="Clear" />
            <ActionButton id="swaprows" onClick={swap} text="Swap Rows" />
          </div>
        </div>
      </div>
    </div>
    <table class="table table-hover table-striped test-rows">
      <tbody>
        <ForEach each={rows} use={(row: RowSchema) => <Row row={row} />} fallback={() => <tr></tr>} />
      </tbody>
    </table>
    <span class="preloadicon glyphicon glyphicon-remove" ariaHidden="true"></span>
  </div>
</div>
);
