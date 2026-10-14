# Laurinita

Loja e administração com dados persistentes no D1. Valores e produtos iniciais são demonstrativos. O catálogo só é gravado quando o administrador escolhe carregar a demonstração.

O site nasce privado. A primeira identidade autenticada torna-se administradora, apoiada na restrição de acesso ao proprietário do Sites. Antes de abrir acesso público, entre como proprietário e estabeleça os perfis. Login/cadastro usam a identidade ChatGPT do Sites. Não há senha própria.

Encomendas reservam estoque em uma transação; preços vêm do banco. Cancelamentos e devoluções usam uma chave única por encomenda e produto. Triggers atualizam o saldo e impedem estoque negativo; movimentos são imutáveis. Cancelados e devolvidos são estados finais. O painel permite produtos, movimentos com motivo, clientes, perfis e CSV.

Pagamentos e frete são a combinar. Para operação comercial: substituir produtos/ilustrações por catálogo real, configurar provedor de pagamento e entrega, contactos comerciais e políticas da loja.
