"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Loader2,
  Rocket,
  Clock,
  ArrowUp,
  Zap,
  Target,
  Gauge,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { CreateFlightRequest } from "@/lib/api";

interface FlightUploadFormProps {
  onUpload: (data: CreateFlightRequest) => void;
  loading: boolean;
}

interface FormField {
  key: keyof CreateFlightRequest;
  label: string;
  unit: string;
  icon: React.ReactNode;
  min?: number;
  max?: number;
  step: number;
  placeholder?: string;
}

const MEASUREMENT_FIELDS: FormField[] = [
  { key: "flightTime", label: "Flight Time", unit: "s", icon: <Clock className="h-4 w-4" />, min: 0, max: 60, step: 0.1, placeholder: "3.2" },
  { key: "maxAltitude", label: "Maximum Altitude", unit: "m", icon: <ArrowUp className="h-4 w-4" />, min: 0, max: 500, step: 0.1, placeholder: "42.5" },
  { key: "maxVelocity", label: "Maximum Velocity", unit: "m/s", icon: <Zap className="h-4 w-4" />, min: 0, max: 200, step: 0.1, placeholder: "28.1" },
  { key: "landingDistance", label: "Landing Distance", unit: "m", icon: <Target className="h-4 w-4" />, min: 0, max: 500, step: 0.1, placeholder: "15.0" },
];

const CONFIG_FIELDS: FormField[] = [
  { key: "launchAngle", label: "Launch Angle", unit: "°", icon: <Target className="h-4 w-4" />, min: 0, max: 90, step: 1, placeholder: "75" },
  { key: "pressure", label: "Initial Pressure", unit: "Pa", icon: <Gauge className="h-4 w-4" />, min: 0, max: 2000000, step: 10000, placeholder: "400000" },
  { key: "waterVolume", label: "Water Volume", unit: "m³", icon: <Rocket className="h-4 w-4" />, min: 0, max: 0.01, step: 0.0001, placeholder: "0.0007" },
  { key: "rocketMass", label: "Rocket Mass", unit: "kg", icon: <Rocket className="h-4 w-4" />, min: 0.05, max: 5.0, step: 0.01, placeholder: "0.15" },
];

export default function FlightUploadForm({ onUpload, loading }: FlightUploadFormProps) {
  const [formData, setFormData] = useState<CreateFlightRequest>({
    notes: "",
    source: "manual",
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"manual" | "csv">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (key: keyof CreateFlightRequest, value: string) => {
    const numValue = parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvPreview(content);
        setFormData((prev) => ({
          ...prev,
          csvRaw: content,
          source: "csv",
        }));
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveCsv = () => {
    setCsvFile(null);
    setCsvPreview(null);
    setFormData((prev) => ({
      ...prev,
      csvRaw: undefined,
      source: "manual",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    onUpload({
      ...formData,
      source: uploadMode === "csv" ? "csv" : "manual",
    });
  };

  const hasRequiredData =
    (formData.maxAltitude !== undefined || formData.csvRaw) &&
    formData.maxAltitude !== undefined;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5 text-blue-500" />
          Upload Flight Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={uploadMode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadMode("manual")}
            className="flex-1"
          >
            Manual Entry
          </Button>
          <Button
            variant={uploadMode === "csv" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadMode("csv")}
            className="flex-1"
          >
            <FileText className="mr-2 h-4 w-4" />
            CSV Upload
          </Button>
        </div>

        {/* CSV Upload */}
        {uploadMode === "csv" && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              {csvFile ? (
                <div className="space-y-2">
                  <FileText className="mx-auto h-8 w-8 text-blue-500" />
                  <p className="text-sm font-medium">{csvFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(csvFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCsv}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="space-y-2"
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload CSV file
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Supports columns: time, altitude, velocity, acceleration
                  </p>
                </button>
              )}
            </div>

            {csvPreview && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  CSV Preview (first 5 rows):
                </p>
                <pre className="overflow-x-auto text-xs font-mono">
                  {csvPreview.split("\n").slice(0, 6).join("\n")}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Manual measurement fields */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Measured Results
          </h3>
          <div className="space-y-4">
            {MEASUREMENT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    {field.icon}
                    {field.label}
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {field.unit}
                  </span>
                </div>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  placeholder={field.placeholder}
                  value={(formData[field.key] as number) ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Launch configuration */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Launch Configuration
          </h3>
          <div className="space-y-4">
            {CONFIG_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    {field.icon}
                    {field.label}
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {field.unit}
                  </span>
                </div>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  placeholder={field.placeholder}
                  value={(formData[field.key] as number) ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Notes</Label>
          <textarea
            placeholder="Weather conditions, launch site, observations..."
            value={formData.notes || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !formData.maxAltitude}
          className="w-full gap-2 rounded-full font-semibold"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Save Flight Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
