import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminCommunicationPage() {
  const { toast } = useToast();
  const [announcement, setAnnouncement] = useState("");
  const [emailTo, setEmailTo] = useState("all");
  const [emailTemplate, setEmailTemplate] = useState("welcome");

  const sendAnnouncement = () =>
    toast({ title: "Announcement", description: "Sent (demo)" });
  const sendEmail = () =>
    toast({
      title: "Email",

      description: `Template ${emailTemplate} to ${emailTo} (demo)`,
    });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication & Support</h1>
        <p className="text-muted-foreground">
          Announcements, emails, and notifications
        </p>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>In-app Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Message"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}

          />
          <div className="mt-2">
            <Button onClick={sendAnnouncement}>Send</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Welcome, payment success/failure, etc.
          </CardDescription>

        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="Recipients"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}

            />
            <Input
              placeholder="Template name"
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}

            />
            <Button onClick={sendEmail}>Send Email</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>Support inbox (demo)</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[1, 2, 3].map((i) => (

              <li
                key={i}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <span>Issue #{i}</span>
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
