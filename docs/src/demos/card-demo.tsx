
import Button from "@registry/button/css/button.js";
import Card, { CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@registry/card/css/card.js";
import { stack } from "./demo-kit";

export default function CardDemo() {
  return (
    <div class={stack}>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>You have three unread messages waiting in your inbox.</CardDescription>
          <CardAction><Button variant="outline" size="sm">Mark all read</Button></CardAction>
        </CardHeader>
        <CardContent><p>Review your notification preferences and inbox rules at any time from settings.</p></CardContent>
        <CardFooter><Button>Open settings</Button></CardFooter>
      </Card>
    </div>
  );
}

export function CardMinimalDemo() {
  return (
    <div class={stack}>
      <Card>
        <CardHeader>
          <CardTitle>Deploys</CardTitle>
          <CardDescription>128 this week.</CardDescription>
        </CardHeader>
        <CardContent><p>All regions green.</p></CardContent>
      </Card>
    </div>
  );
}
