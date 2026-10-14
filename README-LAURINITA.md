# Laurinita

Loja e administração com dados persistentes no D1. Valores e produtos iniciais são demonstrativos. O catálogo só é gravado quando o administrador escolhe carregar a demonstração.

O site nasce privado. A primeira identidade autenticada torna-se administradora, apoiada na restrição de acesso ao proprietário do Sites. Antes de abrir acesso público, entre como proprietário e estabeleça os perfis. Login/cadastro usam a identidade ChatGPT do Sites. Não há senha própria.

Encomendas reservam estoque em uma transação; preços vêm do banco. Cancelamentos e devoluções usam uma chave única por encomenda e produto. O saldo é calculado a partir do histórico de movimentos. Uma inserção condicional revalida o saldo dentro da transação: estoque insuficiente provoca uma violação NOT NULL e reverte o pedido inteiro. A API não permite editar ou excluir movimentos. Cancelados e devolvidos são estados finais. O painel permite produtos, movimentos com motivo, clientes, perfis e CSV. A coluna antiga products.stock permanece apenas para compatibilidade; os saldos são lidos de catalog_stock.

Pagamentos e frete são a combinar. Para operação comercial: substituir produtos/ilustrações por catálogo real, configurar provedor de pagamento e entrega, contactos comerciais e políticas da loja.

Neste Windows, o Bash do empacotador Sites está indisponível. `scripts/package-portable.mjs` usa o validador de artefactos do Sites e o tar nativo. Recebe o caminho absoluto de `prepare-site-build.cjs`, o arquivo de saída e o SHA já enviado/verificado; recusa alterações locais. A primeira publicação falhou nas triggers de 0001, antes de existir uma versão ativa. O artefacto dessa migração pendente conserva seus índices e omite essas triggers; 0002 passa a calcular os saldos pelo histórico, com validação transacional na API. Os arquivos SQL históricos e seus metadados permanecem intactos. O empacotador executa os testes de estoque contra as migrações efetivamente empacotadas.
