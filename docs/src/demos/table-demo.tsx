import { style } from "@hellajs/css";
import Table, { TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@registry/table/css/table.js";

const right = style({ textAlign: "right" }, { label: "demo-num" });

const invoices = [
  { invoice: "INV001", status: "Paid", method: "Credit Card", amount: "$250.00" },
  { invoice: "INV002", status: "Pending", method: "PayPal", amount: "$125.00" },
  { invoice: "INV003", status: "Paid", method: "Bank Transfer", amount: "$310.00" },
];

const columns = ["Invoice", "Customer", "Status", "Method", "Issued", "Due", "Terms", "Amount"];

const ledger = [
  ["INV001", "Acme Corp", "Paid", "Credit Card", "Mar 01", "Mar 31", "Net 30", "$250.00"],
  ["INV002", "Globex", "Pending", "PayPal", "Mar 04", "Apr 03", "Net 30", "$125.00"],
  ["INV003", "Initech", "Paid", "Bank Transfer", "Mar 09", "Apr 08", "Net 30", "$310.00"],
];

export function TableDemo() {
  return (
    <>
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader><TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead class={right}>Amount</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow>
              <TableCell>{inv.invoice}</TableCell>
              <TableCell>{inv.status}</TableCell>
              <TableCell>{inv.method}</TableCell>
              <TableCell class={right}>{inv.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter><TableRow>
          <TableHead colspan={3}>Total</TableHead>
          <TableCell class={right}>$685.00</TableCell>
        </TableRow></TableFooter>
      </Table>
    </>
  );
}

export function TableWideDemo() {
  return (
    <>
      <Table>
        <TableHeader><TableRow>
          {columns.map((col) => <TableHead>{col}</TableHead>)}
        </TableRow></TableHeader>
        <TableBody>
          {ledger.map((cells) => (
            <TableRow>
              {cells.map((cell, index) => (
                <TableCell class={index === 7 ? right : undefined}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
