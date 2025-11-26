import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";


export default function OrgSettings() {
  const { currentOrganization, updateOrganization, deleteOrganization } = useOrganization();
  const { toast } = useToast();
  const [name, setName] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setName(currentOrganization?.name || "");

  }, [currentOrganization]);

  if (!currentOrganization) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No organization selected.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateOrganization(currentOrganization.id, { name: name.trim() });
    } catch (error: any) {
      console.error("OrgSettings save error:", {

        orgId: currentOrganization.id,
        payload: { name: name.trim() },
        error,
      });
      toast({
        title: "Save failed",
        description:
          typeof error?.message === "string"
            ? error.message
            : "Unable to save organization settings",
        variant: "destructive",

      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOrganization(currentOrganization.id);
      // After deletion, navigate to dashboard
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("OrgSettings delete error:", {

        orgId: currentOrganization.id,
        error,
      });
      toast({
        title: "Deletion failed",
        description:
          typeof error?.message === "string"
            ? error.message
            : "Unable to delete organization",
        variant: "destructive",

      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <label htmlFor="org-name" className="text-sm font-medium">Organization Name</label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}

              placeholder="Your organization name"
              disabled={saving}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="org-id" className="text-sm font-medium">Organization ID</label>
            <Input id="org-id" value={currentOrganization.id} readOnly />
            <p className="text-xs text-muted-foreground">This ID is read-only for Org Owners. Changes can only be performed by Super Admins in the site-wide admin interface.</p>

          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save Changes"}

            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Delete Organization</h3>
              <p className="text-sm text-muted-foreground">Deleting an organization is permanent. This action cannot be undone.</p>

            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Organization</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your organization and all related data. This action cannot be undone.

                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}

                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

