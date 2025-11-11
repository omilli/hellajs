import { css } from "@hellajs/css";
import { size } from "@hellajs/ui";
import { table, tableContainer, tableStriped, tableBordered, tableBorderedCells, tableHover, tableCompact } from "@hellajs/ui";

const sectionStyle = css({
  marginBlock: size(2),
}, { name: "table-section" });

const headingStyle = css({
  fontSize: size(1.25),
  fontWeight: 600,
  marginBottom: size(1),
  color: "var(--color-neutral-800)",
}, { name: "table-heading" });

export const Table = () => {
  const baseTable = table();
  const container = tableContainer();
  const striped = tableStriped();
  const bordered = tableBordered();
  const borderedCells = tableBorderedCells();
  const hover = tableHover();
  const compact = tableCompact();

  return <>
    <h1>Tables</h1>

    <section class={sectionStyle}>
      <h2 class={headingStyle}>Basic Table (Borderless)</h2>
      <div class={container}>
        <table class={baseTable} role="table" aria-label="User information">
          <caption>Team Members</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>1</td>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>2</td>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Designer</td>
            </tr>
            <tr tabIndex={0}>
              <td>3</td>
              <td>Carol Williams</td>
              <td>carol@example.com</td>
              <td>Manager</td>
            </tr>
            <tr tabIndex={0}>
              <td>4</td>
              <td>David Brown</td>
              <td>david@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>5</td>
              <td>Eve Davis</td>
              <td>eve@example.com</td>
              <td>QA Engineer</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class={sectionStyle}>
      <h2 class={headingStyle}>Bordered Table (Rows)</h2>
      <div class={container}>
        <table class={`${baseTable} ${bordered}`} role="table">
          <caption>Row Borders</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>1</td>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>2</td>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Designer</td>
            </tr>
            <tr tabIndex={0}>
              <td>3</td>
              <td>Carol Williams</td>
              <td>carol@example.com</td>
              <td>Manager</td>
            </tr>
            <tr tabIndex={0}>
              <td>4</td>
              <td>David Brown</td>
              <td>david@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>5</td>
              <td>Eve Davis</td>
              <td>eve@example.com</td>
              <td>QA Engineer</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class={sectionStyle}>
      <h2 class={headingStyle}>Bordered Table (Full)</h2>
      <div class={container}>
        <table class={`${baseTable} ${borderedCells}`} role="table">
          <caption>All Cell Borders</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>1</td>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>2</td>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Designer</td>
            </tr>
            <tr tabIndex={0}>
              <td>3</td>
              <td>Carol Williams</td>
              <td>carol@example.com</td>
              <td>Manager</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class={sectionStyle}>
      <h2 class={headingStyle}>Striped Hover Table</h2>
      <div class={container}>
        <table class={`${baseTable} ${striped} ${hover}`} role="table">
          <caption>Interactive Rows</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>1</td>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>2</td>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Designer</td>
            </tr>
            <tr tabIndex={0}>
              <td>3</td>
              <td>Carol Williams</td>
              <td>carol@example.com</td>
              <td>Manager</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class={sectionStyle}>
      <h2 class={headingStyle}>Compact Bordered Table</h2>
      <div class={container}>
        <table class={`${baseTable} ${compact} ${bordered}`} role="table">
          <caption>Compact Spacing</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>1</td>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>2</td>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Designer</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class={sectionStyle}>
      <h2 class={headingStyle}>Colored Table (Primary)</h2>
      <div class={container}>
        <table class={`${baseTable} table-primary ${striped}`} role="table">
          <caption>Primary Color Theme</caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>1</td>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>Developer</td>
            </tr>
            <tr tabIndex={0}>
              <td>2</td>
              <td>Bob Smith</td>
              <td>bob@example.com</td>
              <td>Designer</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </>;
};
