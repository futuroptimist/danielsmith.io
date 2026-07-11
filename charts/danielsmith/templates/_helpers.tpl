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
app.kubernetes.io/component: web
app.kubernetes.io/part-of: danielsmith-io
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "danielsmith.selectorLabels" -}}
app.kubernetes.io/name: danielsmith
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: web
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

{{/* Validate GitHub metrics cache values that must line up across mounts. */}}
{{- define "danielsmith.githubMetricsCache.validate" -}}
{{- if .Values.githubMetricsCache.enabled -}}
{{- $outputPath := toString .Values.githubMetricsCache.outputPath -}}
{{- $publicPath := toString .Values.githubMetricsCache.publicPath -}}
{{- $outputDir := dir $outputPath -}}
{{- $publicDir := dir $publicPath -}}
{{- if not (hasPrefix "/" $outputPath) -}}
{{- fail "githubMetricsCache.outputPath must be an absolute path" -}}
{{- end -}}
{{- if not (hasPrefix "/" $publicPath) -}}
{{- fail "githubMetricsCache.publicPath must be an absolute path" -}}
{{- end -}}
{{- if ne (clean $outputPath) $outputPath -}}
{{- fail "githubMetricsCache.outputPath must be normalized and must not contain dot segments" -}}
{{- end -}}
{{- if ne (clean $publicPath) $publicPath -}}
{{- fail "githubMetricsCache.publicPath must be normalized and must not contain dot segments" -}}
{{- end -}}
{{- if eq $outputDir "/" -}}
{{- fail "githubMetricsCache.outputPath must include a non-root directory" -}}
{{- end -}}
{{- if eq $publicDir "/" -}}
{{- fail "githubMetricsCache.publicPath must include a non-root directory" -}}
{{- end -}}
{{- if ne (base $outputPath) (base $publicPath) -}}
{{- fail "githubMetricsCache.outputPath and githubMetricsCache.publicPath must use the same file name" -}}
{{- end -}}
{{- if ne $publicPath "/runtime/github-metrics.json" -}}
{{- fail "githubMetricsCache.publicPath must be exactly /runtime/github-metrics.json" -}}
{{- end -}}
{{- if eq (len .Values.githubMetricsCache.repos) 0 -}}
{{- fail "githubMetricsCache.repos must include at least one repository" -}}
{{- end -}}
{{- range $index, $repo := .Values.githubMetricsCache.repos -}}
{{- if or (not $repo.owner) (not $repo.repo) -}}
{{- fail (printf "githubMetricsCache.repos[%d] must include non-empty owner and repo" $index) -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCache.image" -}}
{{- if .Values.githubMetricsCache.image.digest -}}
{{- printf "%s@%s" .Values.githubMetricsCache.image.repository .Values.githubMetricsCache.image.digest -}}
{{- else -}}
{{- printf "%s:%s" .Values.githubMetricsCache.image.repository (required "githubMetricsCache.image.tag is required when githubMetricsCache.image.digest is not set" .Values.githubMetricsCache.image.tag) -}}
{{- end -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCache.outputDir" -}}
{{- dir .Values.githubMetricsCache.outputPath -}}
{{- end -}}

{{- define "danielsmith.githubMetricsCache.publicDir" -}}
{{- printf "/usr/share/nginx/html/%s" (dir (trimPrefix "/" .Values.githubMetricsCache.publicPath)) | clean -}}
{{- end -}}
