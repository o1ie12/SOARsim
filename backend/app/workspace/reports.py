"""
Engineering Reports for SOARSim v2.0.

Generates professional engineering reports from simulation and validation data.
Supports HTML and Markdown export (PDF via browser print).

Design decisions:
    - Reports are generated from structured data, not templates
    - HTML reports are self-contained with inline styles
    - Markdown reports are portable and version-control friendly
    - All reports include timestamps and metadata for traceability
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

DEFAULT_DATA_DIR = Path.home() / ".soarsim" / "workspace"


@dataclass
class Report:
    """An engineering report with all sections."""

    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    title: str = "Engineering Report"
    rocket_name: str = ""
    rocket_id: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    # Report sections
    rocket_overview: dict = field(default_factory=dict)
    simulation_parameters: dict = field(default_factory=dict)
    performance_metrics: dict = field(default_factory=dict)
    trajectory_data: list[dict] = field(default_factory=list)
    validation_summary: Optional[dict] = None
    engineering_notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> Report:
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in known})


class ReportGenerator:
    """Generates engineering reports from simulation and validation data."""

    def __init__(self, data_dir: Optional[Path] = None) -> None:
        self._data_dir = data_dir or DEFAULT_DATA_DIR
        self._reports_dir = self._data_dir / "reports"
        self._reports_dir.mkdir(parents=True, exist_ok=True)

    def create_report(
        self,
        rocket_name: str,
        rocket_id: Optional[str],
        simulation_request: dict,
        simulation_summary: dict,
        trajectory: Optional[list[dict]] = None,
        validation: Optional[dict] = None,
        notes: Optional[list[str]] = None,
    ) -> Report:
        """Create a new engineering report.

        Args:
            rocket_name: Name of the rocket.
            rocket_id: Optional rocket library ID.
            simulation_request: Full simulation request parameters.
            simulation_summary: Simulation results summary.
            trajectory: Optional trajectory data (sampled for report).
            validation: Optional validation results.
            notes: Optional engineering notes.

        Returns:
            The created Report.
        """
        # Sample trajectory for report (every 10th point)
        sampled_trajectory = []
        if trajectory:
            step = max(1, len(trajectory) // 50)
            sampled_trajectory = trajectory[::step]

        report = Report(
            title=f"Engineering Report — {rocket_name}",
            rocket_name=rocket_name,
            rocket_id=rocket_id,
            rocket_overview=self._extract_overview(simulation_request),
            simulation_parameters=self._extract_parameters(simulation_request),
            performance_metrics=simulation_summary,
            trajectory_data=sampled_trajectory,
            validation_summary=validation,
            engineering_notes=notes or [],
        )

        self._save(report)
        return report

    def export_html(self, report: Report) -> str:
        """Export a report as self-contained HTML.

        Args:
            report: The report to export.

        Returns:
            Complete HTML string with inline styles.
        """
        metrics = report.performance_metrics
        overview = report.rocket_overview
        params = report.simulation_parameters

        # Build metrics table rows
        metrics_rows = ""
        metric_items = [
            ("Maximum Altitude", metrics.get("maxAltitude", 0), "m"),
            ("Flight Time", metrics.get("flightTime", 0), "s"),
            ("Maximum Velocity", metrics.get("maxVelocity", 0), "m/s"),
            ("Maximum Acceleration", metrics.get("maxAcceleration", 0), "m/s²"),
        ]
        for name, value, unit in metric_items:
            if isinstance(value, (int, float)):
                metrics_rows += f"""
                <tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">{name}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">{value:.2f}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{unit}</td>
                </tr>"""

        # Build params section
        params_html = ""
        propulsion = params.get("propulsion", {})
        rocket_p = params.get("rocket", {})
        launch = params.get("launch", {})
        param_items = [
            ("Drag Coefficient", rocket_p.get("dragCoefficient", 0)),
            ("Cross-Sectional Area", f"{rocket_p.get('crossSectionalArea', 0) * 10000:.1f} cm²"),
            ("Dry Mass", f"{propulsion.get('dryMass', 0):.3f} kg"),
            ("Bottle Volume", f"{propulsion.get('bottleVolume', 0) * 1000:.0f} mL"),
            ("Water Volume", f"{propulsion.get('waterVolume', 0) * 1000:.0f} mL"),
            ("Initial Pressure", f"{propulsion.get('initialPressure', 0) / 100000:.1f} bar"),
            ("Nozzle Diameter", f"{propulsion.get('nozzleDiameter', 0) * 1000:.1f} mm"),
            ("Launch Angle", f"{launch.get('angle', 0):.0f}°"),
        ]
        for name, value in param_items:
            params_html += f"""
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">{name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace;">{value}</td>
            </tr>"""

        # Validation section
        validation_html = ""
        if report.validation_summary:
            v = report.validation_summary
            accuracy = v.get("overallAccuracy", 0)
            validation_html = f"""
            <div style="margin-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #374151;">Validation Summary</h3>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px;">
                    <p style="font-size: 24px; font-weight: 700; color: #16a34a;">{accuracy:.1%} accuracy</p>
                    <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Overall simulation accuracy score</p>
                </div>
            </div>"""

        # Notes section
        notes_html = ""
        if report.engineering_notes:
            items = "".join(
                f'<li style="margin-bottom: 8px;">{note}</li>'
                for note in report.engineering_notes
            )
            notes_html = f"""
            <div style="margin-top: 24px;">
                <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #374151;">Engineering Notes</h3>
                <ul style="list-style: disc; padding-left: 20px; font-size: 13px; color: #4b5563; line-height: 1.8;">
                    {items}
                </ul>
            </div>"""

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{report.title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }}
        @media print {{ body {{ padding: 20px; }} }}
    </style>
</head>
<body>
    <div style="border-bottom: 2px solid #f97316; padding-bottom: 16px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #f97316; display: inline-block;"></span>
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">SOARSim Engineering Report</span>
        </div>
        <h1 style="font-size: 24px; font-weight: 700;">{report.title}</h1>
        <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Generated {report.created_at[:10]}</p>
    </div>

    <div>
        <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #374151;">Performance Metrics</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            {metrics_rows}
        </table>
    </div>

    <div style="margin-top: 24px;">
        <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #374151;">Simulation Parameters</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            {params_html}
        </table>
    </div>

    {validation_html}
    {notes_html}

    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
        Generated by SOARSim v2.0 — Physics-Based Rocket Flight Simulator
    </div>
</body>
</html>"""
        return html

    def export_markdown(self, report: Report) -> str:
        """Export a report as Markdown.

        Args:
            report: The report to export.

        Returns:
            Markdown string.
        """
        metrics = report.performance_metrics
        params = report.simulation_parameters
        propulsion = params.get("propulsion", {})
        rocket_p = params.get("rocket", {})
        launch = params.get("launch", {})

        md = f"""# {report.title}

**Generated:** {report.created_at[:10]}
**Rocket:** {report.rocket_name}

---

## Performance Metrics

| Metric | Value | Unit |
|--------|-------|------|
| Maximum Altitude | {metrics.get('maxAltitude', 0):.2f} | m |
| Flight Time | {metrics.get('flightTime', 0):.2f} | s |
| Maximum Velocity | {metrics.get('maxVelocity', 0):.2f} | m/s |
| Maximum Acceleration | {metrics.get('maxAcceleration', 0):.2f} | m/s² |

## Simulation Parameters

| Parameter | Value |
|-----------|-------|
| Drag Coefficient | {rocket_p.get('dragCoefficient', 0)} |
| Cross-Sectional Area | {rocket_p.get('crossSectionalArea', 0) * 10000:.1f} cm² |
| Dry Mass | {propulsion.get('dryMass', 0):.3f} kg |
| Bottle Volume | {propulsion.get('bottleVolume', 0) * 1000:.0f} mL |
| Water Volume | {propulsion.get('waterVolume', 0) * 1000:.0f} mL |
| Initial Pressure | {propulsion.get('initialPressure', 0) / 100000:.1f} bar |
| Nozzle Diameter | {propulsion.get('nozzleDiameter', 0) * 1000:.1f} mm |
| Launch Angle | {launch.get('angle', 0):.0f}° |
"""
        if report.validation_summary:
            accuracy = report.validation_summary.get("overallAccuracy", 0)
            md += f"\n## Validation Summary\n\n**Overall Accuracy:** {accuracy:.1%}\n"

        if report.engineering_notes:
            md += "\n## Engineering Notes\n\n"
            for note in report.engineering_notes:
                md += f"- {note}\n"

        md += "\n---\n\n*Generated by SOARSim v2.0 — Physics-Based Rocket Flight Simulator*\n"
        return md

    def list_reports(self) -> list[Report]:
        """List all saved reports, newest first."""
        reports = []
        for path in self._reports_dir.glob("*.json"):
            try:
                with open(path) as f:
                    reports.append(Report.from_dict(json.load(f)))
            except (json.JSONDecodeError, KeyError):
                continue
        reports.sort(key=lambda r: r.created_at, reverse=True)
        return reports

    def get_report(self, report_id: str) -> Optional[Report]:
        """Get a report by ID."""
        path = self._reports_dir / f"{report_id}.json"
        if not path.exists():
            return None
        with open(path) as f:
            return Report.from_dict(json.load(f))

    def delete_report(self, report_id: str) -> bool:
        """Delete a report."""
        path = self._reports_dir / f"{report_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def _extract_overview(self, request: dict) -> dict:
        """Extract rocket overview from simulation request."""
        propulsion = request.get("propulsion", {})
        return {
            "type": propulsion.get("type", "water"),
            "dry_mass": propulsion.get("dryMass", 0),
            "total_mass": propulsion.get("dryMass", 0) + (
                propulsion.get("waterVolume", 0) * 1000  # approximate water mass
            ),
        }

    def _extract_parameters(self, request: dict) -> dict:
        """Extract full simulation parameters."""
        return request

    def _save(self, report: Report) -> None:
        """Persist a report to disk."""
        path = self._reports_dir / f"{report.id}.json"
        with open(path, "w") as f:
            json.dump(report.to_dict(), f, indent=2)
