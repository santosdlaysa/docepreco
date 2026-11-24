$ErrorActionPreference = 'Stop'
$deliveryRoot = Split-Path $PSScriptRoot -Parent
$contentPath = Join-Path $deliveryRoot 'DP-003-conteudos.md'
$copyPath = Join-Path $deliveryRoot 'DP-004-mensagens.md'
$campaignPath = Join-Path $deliveryRoot 'DP-002-campanha-ativacao.md'
$content = Get-Content $contentPath -Raw -Encoding UTF8
$copy = Get-Content $copyPath -Raw -Encoding UTF8
$campaign = Get-Content $campaignPath -Raw -Encoding UTF8
$contentMatches = [regex]::Matches($content, '(?ms)^## (Peça (\d+) [^\r\n]+)\r?\n(.*?)(?=^## |\z)')
$contentRows = @($contentMatches | ForEach-Object {
  $body = $_.Groups[3].Value.Trim()
  $heading = $_.Groups[1].Value
  [pscustomobject]@{ id=('C'+$_.Groups[2].Value); dia_relativo=$_.Groups[2].Value; titulo=$heading; texto_completo=$body; fonte='DP-003-conteudos.md'; estado='Preparado; nao publicado' }
})
$messageRows = @()
$sections = [regex]::Matches($copy, '(?ms)^## (\d+)\. ([^\r\n]+)\r?\n(.*?)(?=^## |\z)')
foreach($section in $sections){
  foreach($variant in [regex]::Matches($section.Groups[3].Value,'(?m)^([AB]): ([^\r\n]+)')){
    $messageRows += [pscustomobject]@{id=('W'+$section.Groups[1].Value+$variant.Groups[1].Value); canal='WhatsApp'; etapa=$section.Groups[2].Value; variante=$variant.Groups[1].Value; publico=([regex]::Match($section.Groups[3].Value,'(?m)^Público: (.*?) Ação:').Groups[1].Value); titulo=''; texto=$variant.Groups[2].Value; acao=([regex]::Match($section.Groups[3].Value,'Ação: ([^\r\n]+)').Groups[1].Value); caracteres_titulo=0; caracteres_texto=$variant.Groups[2].Value.Length; fonte='DP-004-mensagens.md'; estado='Preparado; nao enviado'}
  }
}
foreach($push in [regex]::Matches($copy,'(?m)^\| (N\d) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|')){
  $title=$push.Groups[3].Value.Trim(); $body=$push.Groups[4].Value.Trim()
  $messageRows += [pscustomobject]@{id=$push.Groups[1].Value; canal='Push'; etapa='Ativacao'; variante='Unica'; publico=$push.Groups[2].Value.Trim(); titulo=$title; texto=$body; acao=$push.Groups[5].Value.Trim(); caracteres_titulo=$title.Length; caracteres_texto=$body.Length; fonte='DP-004-mensagens.md'; estado='Preparado; nao enviado'}
}
$proposal=[regex]::Match($campaign,'(?ms)^## Proposta\r?\n(.*?)(?=^## )').Groups[1].Value.Trim()
$rules=[regex]::Match($campaign,'(?m)^Antes de cada contato[^\r\n]+').Value
$measurement=[regex]::Match($campaign,'(?ms)^## Teste e medição\r?\n(.*?)(?=^## )').Groups[1].Value.Trim()
$campaignRows=@([regex]::Matches($campaign,'(?m)^\| (D\d) \| ([^|]+) \| ([^|]+) \|') | ForEach-Object {
  [pscustomobject]@{id=$_.Groups[1].Value; momento_relativo=$_.Groups[1].Value; acao=$_.Groups[2].Value.Trim(); objetivo=$_.Groups[3].Value.Trim(); proposta_e_publico=$proposal; regras=$rules; medicao=$measurement; fonte='DP-002-campanha-ativacao.md'; estado='Preparado; nao executado'}
})
if($contentRows.Count -ne 7){throw 'Conteudos: esperados 7'}
if($messageRows.Count -ne 13){throw 'Mensagens: esperadas 13'}
if(@($messageRows | Where-Object canal -eq 'WhatsApp').Count -ne 10){throw 'WhatsApp: esperadas 10'}
if($campaignRows.Count -ne 3){throw 'Campanha: esperadas 3 etapas'}
$sets=@(
 @{name='calendario-conteudos.csv'; rows=$contentRows; required=@('id','titulo','texto_completo');source=$content; textField='texto_completo'},
 @{name='mensagens.csv'; rows=$messageRows; required=@('id','publico','texto','acao');source=$copy; textField='texto'},
 @{name='campanha.csv'; rows=$campaignRows; required=@('id','acao','objetivo','regras','proposta_e_publico','medicao');source=$campaign; textField='acao'}
)
foreach($set in $sets){
 $target=Join-Path $PSScriptRoot $set.name
 $set.rows | Export-Csv -Path $target -NoTypeInformation -Encoding UTF8
 $restored=@(Import-Csv $target -Encoding UTF8)
 if($restored.Count -ne $set.rows.Count){throw ('Contagem roundtrip: '+$set.name)}
 for($index=0;$index -lt $restored.Count;$index++){
  foreach($field in $set.required){if([string]::IsNullOrWhiteSpace($restored[$index].$field)){throw ('Campo vazio: '+$set.name+' '+$field)}}
  foreach($property in $set.rows[$index].PSObject.Properties){if([string]$restored[$index].($property.Name) -cne [string]$property.Value){throw ('Roundtrip diferente: '+$set.name+' '+$property.Name)}}
  if(-not $set.source.Contains([string]$restored[$index].($set.textField))){throw ('Texto divergente da fonte: '+$set.name)}
 }
 Write-Output ('PASS: '+$set.name+'; '+$restored.Count+' linhas; campos obrigatorios, roundtrip e fidelidade textual')
}
foreach($row in $messageRows){
 if($row.caracteres_texto -ne $row.texto.Length){throw 'Contagem do corpo incorreta'}
 if($row.caracteres_titulo -ne $row.titulo.Length){throw 'Contagem do titulo incorreta'}
 if($row.canal -eq 'Push' -and -not $copy.Contains($row.titulo)){throw 'Titulo push divergente'}
}
Write-Output 'PASS: contagens de caracteres; 10 WhatsApp e 3 pushes. Sem envios ou publicacoes.'
