{{- define "danielsmith.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "danielsmith.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "danielsmith.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "danielsmith.labels" -}}
helm.sh/chart: {{ include "danielsmith.chart" . }}
app.kubernetes.io/name: danielsmith
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "danielsmith.selectorLabels" -}}
app.kubernetes.io/name: danielsmith
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "danielsmith.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "danielsmith.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
Resolve the container image. Digest wins for immutable deploys. Otherwise a tag
is required; values.yaml intentionally supplies `main-latest` as a mutable
convenience default for local lint/template rendering without falling back to
Chart.AppVersion, which is the chart/app version and may not correspond to a
published container tag. Sugarkube staging/prod sign-off must still use an
immutable `main-<shortsha>` tag or `image.digest`.
*/}}
{{- define "danielsmith.image" -}}
{{- if .Values.image.digest -}}
{{- printf "%s@%s" .Values.image.repository .Values.image.digest -}}
{{- else -}}
{{- printf "%s:%s" .Values.image.repository (required "image.tag is required when image.digest is not set" .Values.image.tag) -}}
{{- end -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCacheConfigMapName" -}}
{{- printf "%s-github-metrics-cache" (include "danielsmith.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCacheImage" -}}
{{- printf "%s:%s" .Values.githubMetricsCache.image.repository .Values.githubMetricsCache.image.tag -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCacheOutputDir" -}}
{{- dir .Values.githubMetricsCache.outputPath -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCachePublicDir" -}}
{{- dir .Values.githubMetricsCache.publicPath -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCacheNginxMountPath" -}}
{{- printf "/usr/share/nginx/html%s" (include "danielsmith.githubMetricsCachePublicDir" .) -}}
{{- end -}}
