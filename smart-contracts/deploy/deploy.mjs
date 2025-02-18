import { InMemorySigner, importKey } from '@taquito/signer'
import { MichelsonMap, TezosToolkit } from '@taquito/taquito'
import { char2Bytes } from '@taquito/utils'
import { default as config } from '../asset-registry/.taq/config.local.development.json' with { type: "json" }
import { default as configStaging } from '../asset-registry/.taq/config.local.testing.json' with { type: "json" }


let RPC = 'http://localhost:8732'
let privateKey = config.accounts.bob.secretKey.replace('unencrypted:', '')

if (process.env.ENV === 'staging') {
  RPC = 'https://ghostnet.ecadinfra.com'
  privateKey = configStaging.accounts.taqOperatorAccount.privateKey
}

if (process.env.ENV === 'production') {
  RPC = 'https://mainnet.ecadinfra.com'
}

const Tezos = new TezosToolkit(RPC)

const contract = `
{ parameter
    (or (pair %mint
           (address %to_)
           (nat %token_id)
           (nat %amount)
           (option %token_info (map string bytes)))
        (or (list %approve
               (pair (address %owner)
                     (address %spender)
                     (nat %token_id)
                     (nat %old_value)
                     (nat %new_value)))
            (or (list %update_operators
                   (or (pair %addOperator (address %owner) (address %operator) (nat %token_id))
                       (pair %removeOperator (address %owner) (address %operator) (nat %token_id))))
                (or (pair %balance_of
                       (list %requests (pair (address %owner) (nat %token_id)))
                       (contract %callback
                          (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
                    (list %transfer
                       (pair (address %from_) (list %txs (pair (address %to_) (nat %amount) (nat %token_id))))))))) ;
  storage
    (pair (big_map %metadata string bytes)
          (big_map %assets nat address)
          (big_map %token_metadata nat (pair (nat %token_id) (map %token_info string bytes)))
          (option %operators (big_map (pair address nat) (set address)))
          (big_map %approvals (pair address address nat) nat)) ;
  code { PUSH string "FA2_TOKEN_UNDEFINED" ;
         PUSH string "FA2.1_INSUFFICIENT_ALLOWANCE" ;
         PUSH string "NFT transaction amount should be 1n" ;
         LAMBDA
           (pair (big_map (pair address address nat) nat) address address nat)
           nat
           { UNPAIR 4 ; DUG 3 ; PAIR 3 ; GET ; IF_NONE { PUSH nat 0 } {} } ;
         LAMBDA
           (pair (big_map (pair address address nat) nat) address address nat nat)
           (big_map (pair address address nat) nat)
           { UNPAIR 5 ; DIG 4 ; SOME ; DIG 4 ; DIG 4 ; DIG 4 ; PAIR 3 ; UPDATE } ;
         LAMBDA (pair (big_map nat address) nat) (option address) { UNPAIR ; SWAP ; GET } ;
         LAMBDA
           (pair (big_map nat address) address nat)
           (big_map nat address)
           { UNPAIR 3 ; SWAP ; SOME ; DIG 2 ; UPDATE } ;
         LAMBDA
           (pair (big_map (pair address nat) (set address)) address nat)
           unit
           { UNPAIR 3 ;
             SENDER ;
             DUP 3 ;
             DUP 2 ;
             COMPARE ;
             EQ ;
             IF { DROP 4 }
                { SWAP ;
                  DIG 3 ;
                  DIG 3 ;
                  PAIR ;
                  GET ;
                  IF_NONE { EMPTY_SET address } {} ;
                  SWAP ;
                  MEM ;
                  IF {} { PUSH string "FA2_NOT_OPERATOR" ; FAILWITH } } ;
             UNIT } ;
         LAMBDA
           address
           unit
           { PUSH string "The sender can only manage operators for their own token" ;
             SENDER ;
             DIG 2 ;
             COMPARE ;
             EQ ;
             IF { DROP ; UNIT } { FAILWITH } } ;
         LAMBDA
           (pair (big_map nat (pair nat (map string bytes))) nat (map string bytes))
           (big_map nat (pair nat (map string bytes)))
           { UNPAIR 3 ; DIG 2 ; DUP 3 ; PAIR ; SOME ; DIG 2 ; UPDATE } ;
         LAMBDA
           (pair (pair (lambda (pair (big_map nat address) address nat) (big_map nat address))
                       (lambda (pair (big_map nat address) nat) (option address))
                       string)
                 (pair (big_map string bytes)
                       (big_map nat address)
                       (big_map nat (pair nat (map string bytes)))
                       (option (big_map (pair address nat) (set address)))
                       (big_map (pair address address nat) nat)))
           (pair (big_map nat address)
                 (big_map nat address)
                 (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                 (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                 (lambda (pair (big_map nat address) address nat) nat)
                 (lambda (pair (big_map nat address) nat) (option nat)))
           { UNPAIR ;
             UNPAIR 3 ;
             DIG 3 ;
             LAMBDA
               (pair (lambda (pair (big_map nat address) nat) (option address))
                     (pair (big_map nat address) nat))
               (option nat)
               { UNPAIR ;
                 SWAP ;
                 EXEC ;
                 IF_NONE { NONE nat } { DROP ; PUSH nat 1 ; SOME } } ;
             DUP 4 ;
             APPLY ;
             LAMBDA
               (pair (lambda (pair (big_map nat address) nat) (option address))
                     (pair (big_map nat address) address nat))
               nat
               { UNPAIR ;
                 SWAP ;
                 UNPAIR 3 ;
                 DIG 2 ;
                 SWAP ;
                 PAIR ;
                 DIG 2 ;
                 SWAP ;
                 EXEC ;
                 IF_NONE
                   { DROP ; PUSH nat 0 }
                   { COMPARE ; EQ ; IF { PUSH nat 1 } { PUSH nat 0 } } } ;
             DUP 5 ;
             APPLY ;
             LAMBDA
               (pair (pair (lambda (pair (big_map nat address) address nat) (big_map nat address))
                           (lambda (pair (big_map nat address) nat) (option address))
                           string)
                     (pair (big_map nat address) address nat nat))
               (big_map nat address)
               { UNPAIR ;
                 UNPAIR 3 ;
                 DIG 3 ;
                 UNPAIR 4 ;
                 DUP 3 ;
                 DUP 2 ;
                 PAIR ;
                 DIG 6 ;
                 SWAP ;
                 EXEC ;
                 DROP ;
                 PUSH nat 1 ;
                 DIG 4 ;
                 COMPARE ;
                 EQ ;
                 IF { DIG 4 ; DROP } { DIG 4 ; FAILWITH } ;
                 PAIR 3 ;
                 EXEC } ;
             DUP 7 ;
             DUP 7 ;
             DUP 7 ;
             PAIR 3 ;
             APPLY ;
             LAMBDA
               (pair (pair (lambda (pair (big_map nat address) address nat) (big_map nat address))
                           (lambda (pair (big_map nat address) nat) (option address))
                           string)
                     (pair (big_map nat address) address nat nat))
               (big_map nat address)
               { UNPAIR ;
                 UNPAIR 3 ;
                 DIG 3 ;
                 UNPAIR 4 ;
                 DUP 3 ;
                 DUP 2 ;
                 PAIR ;
                 DIG 6 ;
                 SWAP ;
                 EXEC ;
                 DROP ;
                 PUSH nat 1 ;
                 DIG 4 ;
                 COMPARE ;
                 EQ ;
                 IF { DIG 4 ; DROP ; DUP 2 ; DROP } { DIG 4 ; FAILWITH } ;
                 PAIR 3 ;
                 EXEC } ;
             DUP 8 ;
             DUP 8 ;
             DUP 8 ;
             PAIR 3 ;
             APPLY ;
             DIG 5 ;
             DIG 6 ;
             DIG 7 ;
             DROP 3 ;
             EMPTY_BIG_MAP nat address ;
             DIG 5 ;
             GET 3 ;
             PAIR 6 } ;
         DUP 9 ;
         DUP 7 ;
         DUP 7 ;
         PAIR 3 ;
         APPLY ;
         DIG 4 ;
         DIG 5 ;
         DIG 8 ;
         DROP 3 ;
         LAMBDA
           (pair (pair (lambda
                          (pair (big_map string bytes)
                                (big_map nat address)
                                (big_map nat (pair nat (map string bytes)))
                                (option (big_map (pair address nat) (set address)))
                                (big_map (pair address address nat) nat))
                          (pair (big_map nat address)
                                (big_map nat address)
                                (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                                (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                                (lambda (pair (big_map nat address) address nat) nat)
                                (lambda (pair (big_map nat address) nat) (option nat))))
                       (lambda
                          (pair (big_map nat (pair nat (map string bytes))) nat (map string bytes))
                          (big_map nat (pair nat (map string bytes)))))
                 (pair (pair address nat nat (option (map string bytes)))
                       (big_map string bytes)
                       (big_map nat address)
                       (big_map nat (pair nat (map string bytes)))
                       (option (big_map (pair address nat) (set address)))
                       (big_map (pair address address nat) nat)))
           (pair (list operation)
                 (big_map string bytes)
                 (big_map nat address)
                 (big_map nat (pair nat (map string bytes)))
                 (option (big_map (pair address nat) (set address)))
                 (big_map (pair address address nat) nat))
           { UNPAIR ;
             UNPAIR ;
             DIG 2 ;
             UNPAIR ;
             DUP 2 ;
             DIG 3 ;
             SWAP ;
             EXEC ;
             DUG 2 ;
             NIL operation ;
             NIL operation ;
             DUP 3 ;
             GET 3 ;
             DUP 6 ;
             CAR ;
             PAIR ;
             DUP 6 ;
             GET 10 ;
             SWAP ;
             EXEC ;
             IF_NONE { PUSH nat 0 } {} ;
             DUP 4 ;
             GET 3 ;
             DUP 5 ;
             CAR ;
             DUP 8 ;
             CAR ;
             PAIR 3 ;
             DUP 7 ;
             GET 9 ;
             SWAP ;
             EXEC ;
             DUP 5 ;
             GET 5 ;
             INT ;
             DIG 2 ;
             DUP 6 ;
             GET 5 ;
             ADD ;
             DUP 6 ;
             GET 3 ;
             PAIR 3 ;
             DUP 5 ;
             GET 5 ;
             INT ;
             DUP 6 ;
             GET 5 ;
             DIG 3 ;
             ADD ;
             DUP 6 ;
             GET 3 ;
             DUP 7 ;
             CAR ;
             PAIR 4 ;
             EMIT %balance_update
               (pair (address %owner) (nat %token_id) (nat %new_balance) (int %diff)) ;
             SWAP ;
             EMIT %total_supply_update
               (pair (nat %token_id) (nat %new_total_supply) (int %diff)) ;
             DUP 6 ;
             GET 5 ;
             DUP 6 ;
             GET 3 ;
             GET ;
             IF_NONE { EMPTY_MAP string bytes } { CDR } ;
             DUP ;
             DUP 7 ;
             GET 3 ;
             DUP 9 ;
             GET 5 ;
             PAIR 3 ;
             DUP 10 ;
             SWAP ;
             EXEC ;
             PUSH nat 0 ;
             DUP 8 ;
             GET 6 ;
             IF_NONE { EMPTY_MAP string bytes } {} ;
             SIZE ;
             COMPARE ;
             EQ ;
             PUSH nat 0 ;
             DIG 3 ;
             SIZE ;
             COMPARE ;
             EQ ;
             AND ;
             IF { DUP 6 ;
                  GET 6 ;
                  IF_NONE { PUSH string "Token info must be provided" ; FAILWITH } { DROP } }
                {} ;
             PUSH nat 0 ;
             DUP 7 ;
             GET 6 ;
             IF_NONE { EMPTY_MAP string bytes } {} ;
             SIZE ;
             COMPARE ;
             GT ;
             IF { DROP ;
                  DUP 5 ;
                  GET 6 ;
                  IF_NONE { EMPTY_MAP string bytes } {} ;
                  DUP 6 ;
                  GET 3 ;
                  DUP 8 ;
                  GET 5 ;
                  PAIR 3 ;
                  DIG 8 ;
                  SWAP ;
                  EXEC ;
                  DUP 6 ;
                  GET 6 ;
                  DUP 7 ;
                  GET 3 ;
                  PAIR ;
                  EMIT %token_metadata_update
                    (pair (nat %token_id) (option %new_metadata (map string bytes))) ;
                  NIL operation ;
                  DIG 6 ;
                  NIL operation ;
                  SWAP ;
                  ITER { CONS } ;
                  ITER { CONS } ;
                  SWAP ;
                  CONS ;
                  DUG 4 }
                { DIG 8 ; DROP } ;
             DUP 6 ;
             GET 5 ;
             DUP 7 ;
             GET 3 ;
             DIG 7 ;
             CAR ;
             DUP 10 ;
             CAR ;
             PAIR 4 ;
             DUP 8 ;
             GET 5 ;
             SWAP ;
             EXEC ;
             NIL operation ;
             DIG 6 ;
             NIL operation ;
             SWAP ;
             ITER { CONS } ;
             ITER { CONS } ;
             DIG 3 ;
             CONS ;
             DUG 4 ;
             NIL operation ;
             DIG 5 ;
             NIL operation ;
             SWAP ;
             ITER { CONS } ;
             ITER { CONS } ;
             DIG 3 ;
             CONS ;
             ITER { NIL operation ;
                    DIG 4 ;
                    NIL operation ;
                    SWAP ;
                    ITER { CONS } ;
                    ITER { CONS } ;
                    SWAP ;
                    CONS ;
                    DUG 2 } ;
             DIG 4 ;
             SWAP ;
             UPDATE 1 ;
             CAR ;
             SWAP ;
             DIG 3 ;
             SWAP ;
             UPDATE 5 ;
             SWAP ;
             UPDATE 3 ;
             SWAP ;
             PAIR } ;
         DUP 3 ;
         DUP 3 ;
         PAIR ;
         APPLY ;
         DIG 2 ;
         DROP ;
         LAMBDA
           (pair (pair (lambda
                          (pair (big_map (pair address address nat) nat) address address nat nat)
                          (big_map (pair address address nat) nat))
                       (lambda (pair (big_map (pair address address nat) nat) address address nat) nat))
                 (pair (list (pair address address nat nat nat))
                       (big_map string bytes)
                       (big_map nat address)
                       (big_map nat (pair nat (map string bytes)))
                       (option (big_map (pair address nat) (set address)))
                       (big_map (pair address address nat) nat)))
           (pair (list operation)
                 (big_map string bytes)
                 (big_map nat address)
                 (big_map nat (pair nat (map string bytes)))
                 (option (big_map (pair address nat) (set address)))
                 (big_map (pair address address nat) nat))
           { UNPAIR ;
             UNPAIR ;
             DIG 2 ;
             UNPAIR ;
             EMPTY_MAP (pair address address nat) (pair nat int) ;
             DUP 3 ;
             GET 8 ;
             NIL operation ;
             DIG 3 ;
             ITER { DIG 2 ;
                    DUP 2 ;
                    UNPAIR 5 ;
                    DUP 3 ;
                    DUP 3 ;
                    DUP 3 ;
                    DUP 9 ;
                    PAIR 4 ;
                    DUP 13 ;
                    SWAP ;
                    EXEC ;
                    DIG 4 ;
                    SWAP ;
                    COMPARE ;
                    EQ ;
                    IF {} { PUSH string "FA2.1_UNSAFE_APPROVAL_CHANGE" ; FAILWITH } ;
                    PUSH string "FA2_NOT_OWNER" ;
                    SENDER ;
                    DUP 3 ;
                    COMPARE ;
                    EQ ;
                    IF { DROP } { FAILWITH } ;
                    DIG 4 ;
                    PAIR 5 ;
                    DUP 6 ;
                    SWAP ;
                    EXEC ;
                    DUG 2 ;
                    DUP ;
                    GET 5 ;
                    DUP 2 ;
                    GET 3 ;
                    DUP 3 ;
                    CAR ;
                    PAIR 3 ;
                    DUP 5 ;
                    DUP 2 ;
                    GET ;
                    IF_NONE
                      { DUP 2 ; GET 7 ; DUP 3 ; GET 8 ; SUB }
                      { DUP 3 ; GET 7 ; DUP 4 ; GET 8 ; SUB ; SWAP ; CDR ; ADD } ;
                    DIG 5 ;
                    SWAP ;
                    DIG 3 ;
                    GET 8 ;
                    PAIR ;
                    SOME ;
                    DIG 2 ;
                    UPDATE ;
                    DUG 2 } ;
             DIG 4 ;
             DIG 5 ;
             DROP 2 ;
             NIL operation ;
             DIG 3 ;
             LAMBDA
               (pair (list operation) (pair address address nat) nat int)
               (list operation)
               { UNPAIR ;
                 SWAP ;
                 UNPAIR ;
                 PUSH int 0 ;
                 DUP 3 ;
                 CDR ;
                 COMPARE ;
                 NEQ ;
                 IF { DUP 2 ;
                      CDR ;
                      DIG 2 ;
                      CAR ;
                      DUP 3 ;
                      GET 4 ;
                      DUP 4 ;
                      GET 3 ;
                      DIG 4 ;
                      CAR ;
                      PAIR 5 ;
                      EMIT %allowance_update
                        (pair (address %owner)
                              (address %spender)
                              (nat %token_id)
                              (nat %new_allowance)
                              (int %diff)) ;
                      NIL operation ;
                      DIG 2 ;
                      NIL operation ;
                      SWAP ;
                      ITER { CONS } ;
                      ITER { CONS } ;
                      SWAP ;
                      CONS }
                    { DROP 2 } } ;
             DUG 2 ;
             ITER { SWAP ; PAIR ; DUP 2 ; SWAP ; EXEC } ;
             SWAP ;
             DROP ;
             ITER { NIL operation ;
                    DIG 2 ;
                    NIL operation ;
                    SWAP ;
                    ITER { CONS } ;
                    ITER { CONS } ;
                    SWAP ;
                    CONS } ;
             SWAP ;
             DIG 2 ;
             SWAP ;
             UPDATE 8 ;
             SWAP ;
             PAIR } ;
         DUP 7 ;
         DUP 7 ;
         PAIR ;
         APPLY ;
         LAMBDA
           (pair (lambda address unit)
                 (pair (list (or (pair address address nat) (pair address address nat)))
                       (big_map string bytes)
                       (big_map nat address)
                       (big_map nat (pair nat (map string bytes)))
                       (option (big_map (pair address nat) (set address)))
                       (big_map (pair address address nat) nat)))
           (pair (list operation)
                 (big_map string bytes)
                 (big_map nat address)
                 (big_map nat (pair nat (map string bytes)))
                 (option (big_map (pair address nat) (set address)))
                 (big_map (pair address address nat) nat))
           { UNPAIR ;
             SWAP ;
             UNPAIR ;
             SENDER ;
             DUP 3 ;
             GET 7 ;
             IF_NONE
               { DROP 4 ;
                 PUSH string "The storage does not support operators management" ;
                 FAILWITH }
               { NIL (pair address address nat bool) ;
                 PAIR ;
                 DIG 2 ;
                 ITER { SWAP ;
                        UNPAIR ;
                        DIG 2 ;
                        IF_LEFT
                          { UNPAIR 3 ;
                            DUP 2 ;
                            DUP 2 ;
                            COMPARE ;
                            EQ ;
                            IF { DIG 4 }
                               { DUP ;
                                 DUP 9 ;
                                 SWAP ;
                                 EXEC ;
                                 DROP ;
                                 DUP 5 ;
                                 DUP 4 ;
                                 DUP 3 ;
                                 PAIR ;
                                 GET ;
                                 IF_NONE { EMPTY_SET address } {} ;
                                 DUP 3 ;
                                 SWAP ;
                                 PUSH bool True ;
                                 DIG 2 ;
                                 UPDATE ;
                                 DIG 5 ;
                                 SWAP ;
                                 SOME ;
                                 DUP 5 ;
                                 DUP 4 ;
                                 PAIR ;
                                 UPDATE } ;
                            NIL (pair address address nat bool) ;
                            DIG 5 ;
                            NIL (pair address address nat bool) ;
                            SWAP ;
                            ITER { CONS } ;
                            ITER { CONS } ;
                            PUSH bool True }
                          { UNPAIR 3 ;
                            DUP 2 ;
                            DUP 2 ;
                            COMPARE ;
                            EQ ;
                            IF { DIG 4 }
                               { DUP ;
                                 DUP 9 ;
                                 SWAP ;
                                 EXEC ;
                                 DROP ;
                                 DUP 5 ;
                                 DUP 4 ;
                                 DUP 3 ;
                                 PAIR ;
                                 GET ;
                                 IF_NONE { EMPTY_SET address } {} ;
                                 DUP 3 ;
                                 SWAP ;
                                 PUSH bool False ;
                                 DIG 2 ;
                                 UPDATE ;
                                 PUSH nat 0 ;
                                 DUP 2 ;
                                 SIZE ;
                                 COMPARE ;
                                 EQ ;
                                 IF { DROP ; DIG 4 ; NONE (set address) ; DUP 5 ; DUP 4 ; PAIR ; UPDATE }
                                    { DIG 5 ; SWAP ; SOME ; DUP 5 ; DUP 4 ; PAIR ; UPDATE } } ;
                            NIL (pair address address nat bool) ;
                            DIG 5 ;
                            NIL (pair address address nat bool) ;
                            SWAP ;
                            ITER { CONS } ;
                            ITER { CONS } ;
                            PUSH bool True } ;
                        DIG 5 ;
                        DIG 5 ;
                        DIG 5 ;
                        PAIR 4 ;
                        CONS ;
                        PAIR } ;
                 DIG 3 ;
                 DROP ;
                 UNPAIR ;
                 DIG 3 ;
                 DIG 2 ;
                 SOME ;
                 UPDATE 7 ;
                 NIL operation ;
                 DIG 3 ;
                 DIG 3 ;
                 PAIR ;
                 EMIT %operator_update
                   (pair (list %newUpdates
                            (pair (address %owner) (address %operator) (nat %token_id) (bool %is_operator)))
                         (address %sender)) ;
                 CONS ;
                 PAIR } } ;
         DUP 5 ;
         APPLY ;
         DIG 4 ;
         DROP ;
         LAMBDA
           (pair (pair (lambda
                          (pair (big_map string bytes)
                                (big_map nat address)
                                (big_map nat (pair nat (map string bytes)))
                                (option (big_map (pair address nat) (set address)))
                                (big_map (pair address address nat) nat))
                          (pair (big_map nat address)
                                (big_map nat address)
                                (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                                (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                                (lambda (pair (big_map nat address) address nat) nat)
                                (lambda (pair (big_map nat address) nat) (option nat))))
                       string)
                 (pair (pair (list (pair address nat)) (contract (list (pair (pair address nat) nat))))
                       (big_map string bytes)
                       (big_map nat address)
                       (big_map nat (pair nat (map string bytes)))
                       (option (big_map (pair address nat) (set address)))
                       (big_map (pair address address nat) nat)))
           (pair (list operation)
                 (big_map string bytes)
                 (big_map nat address)
                 (big_map nat (pair nat (map string bytes)))
                 (option (big_map (pair address nat) (set address)))
                 (big_map (pair address address nat) nat))
           { UNPAIR ;
             UNPAIR ;
             DIG 2 ;
             UNPAIR ;
             DUP 2 ;
             DIG 3 ;
             SWAP ;
             EXEC ;
             DUG 2 ;
             UNPAIR ;
             DUP 3 ;
             NIL operation ;
             DIG 3 ;
             PUSH mutez 0 ;
             DIG 4 ;
             MAP { DUP ;
                   UNPAIR ;
                   DUP 8 ;
                   GET 5 ;
                   DUP 3 ;
                   MEM ;
                   NOT ;
                   IF { DUP 10 ; FAILWITH } {} ;
                   DUP 9 ;
                   CAR ;
                   PAIR 3 ;
                   DUP 8 ;
                   GET 9 ;
                   SWAP ;
                   EXEC ;
                   SWAP ;
                   PAIR } ;
             DIG 5 ;
             DIG 6 ;
             DIG 7 ;
             DROP 3 ;
             TRANSFER_TOKENS ;
             CONS ;
             PAIR } ;
         DUP 10 ;
         DUP 6 ;
         PAIR ;
         APPLY ;
         LAMBDA
           (pair (pair (lambda
                          (pair (big_map string bytes)
                                (big_map nat address)
                                (big_map nat (pair nat (map string bytes)))
                                (option (big_map (pair address nat) (set address)))
                                (big_map (pair address address nat) nat))
                          (pair (big_map nat address)
                                (big_map nat address)
                                (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                                (lambda (pair (big_map nat address) address nat nat) (big_map nat address))
                                (lambda (pair (big_map nat address) address nat) nat)
                                (lambda (pair (big_map nat address) nat) (option nat))))
                       (lambda (pair (big_map (pair address nat) (set address)) address nat) unit)
                       (lambda
                          (pair (big_map (pair address address nat) nat) address address nat nat)
                          (big_map (pair address address nat) nat))
                       (lambda (pair (big_map (pair address address nat) nat) address address nat) nat)
                       string
                       string)
                 (pair (list (pair address (list (pair address nat nat))))
                       (big_map string bytes)
                       (big_map nat address)
                       (big_map nat (pair nat (map string bytes)))
                       (option (big_map (pair address nat) (set address)))
                       (big_map (pair address address nat) nat)))
           (pair (list operation)
                 (big_map string bytes)
                 (big_map nat address)
                 (big_map nat (pair nat (map string bytes)))
                 (option (big_map (pair address nat) (set address)))
                 (big_map (pair address address nat) nat))
           { UNPAIR ;
             UNPAIR 6 ;
             DIG 6 ;
             UNPAIR ;
             DUP 2 ;
             DIG 3 ;
             SWAP ;
             EXEC ;
             DUG 2 ;
             NIL operation ;
             EMPTY_MAP (pair address address nat) (pair nat int) ;
             EMPTY_MAP (pair address nat) (pair nat int) ;
             NIL operation ;
             DUP 6 ;
             GET 8 ;
             DIG 7 ;
             PAIR 5 ;
             DIG 2 ;
             ITER { SWAP ;
                    UNPAIR 5 ;
                    DIG 5 ;
                    UNPAIR ;
                    DIG 6 ;
                    DIG 6 ;
                    DIG 6 ;
                    DIG 6 ;
                    DIG 6 ;
                    PAIR 5 ;
                    DIG 2 ;
                    ITER { SWAP ;
                           UNPAIR 5 ;
                           DIG 2 ;
                           DIG 3 ;
                           DIG 4 ;
                           DIG 5 ;
                           UNPAIR 3 ;
                           DUP 11 ;
                           GET 5 ;
                           DUP 4 ;
                           MEM ;
                           NOT ;
                           IF { DUP 16 ; FAILWITH } {} ;
                           DUP 3 ;
                           SENDER ;
                           DUP 11 ;
                           DUP 11 ;
                           PAIR 4 ;
                           DUP 15 ;
                           SWAP ;
                           EXEC ;
                           SENDER ;
                           DUP 11 ;
                           COMPARE ;
                           EQ ;
                           IF { DIG 8 }
                              { DUP 4 ;
                                SENDER ;
                                DUP 12 ;
                                DUP 12 ;
                                PAIR 4 ;
                                DUP 16 ;
                                SWAP ;
                                EXEC ;
                                PUSH nat 0 ;
                                DUP 2 ;
                                COMPARE ;
                                GT ;
                                IF { DUP 4 ;
                                     SWAP ;
                                     COMPARE ;
                                     GE ;
                                     IF { DUP 3 ;
                                          DUP 5 ;
                                          SENDER ;
                                          DUP 13 ;
                                          DIG 12 ;
                                          DUP 4 ;
                                          DUP 4 ;
                                          DUP 4 ;
                                          DUP 4 ;
                                          PAIR 4 ;
                                          DUP 20 ;
                                          SWAP ;
                                          EXEC ;
                                          PUSH string "FA2_INSUFFICIENT_BALANCE" ;
                                          DUP 7 ;
                                          DUP 3 ;
                                          COMPARE ;
                                          GE ;
                                          IF { DROP } { FAILWITH } ;
                                          DIG 5 ;
                                          SWAP ;
                                          SUB ;
                                          ABS ;
                                          DUG 4 ;
                                          PAIR 5 ;
                                          DUP 14 ;
                                          SWAP ;
                                          EXEC }
                                        { DUP 12 ;
                                          GET 7 ;
                                          IF_NONE
                                            { DIG 8 ; DROP ; DUP 15 ; FAILWITH }
                                            { DUP 5 ; DUP 12 ; DIG 2 ; PAIR 3 ; DUP 14 ; SWAP ; EXEC ; DROP ; DIG 8 } } }
                                   { DROP ;
                                     DUP 12 ;
                                     GET 7 ;
                                     IF_NONE
                                       { DIG 8 ; DROP ; DUP 15 ; FAILWITH }
                                       { DUP 5 ; DUP 12 ; DIG 2 ; PAIR 3 ; DUP 14 ; SWAP ; EXEC ; DROP ; DIG 8 } } } ;
                           DUP 5 ;
                           SENDER ;
                           DUP 12 ;
                           DUP 4 ;
                           PAIR 4 ;
                           DUP 16 ;
                           SWAP ;
                           EXEC ;
                           DUP 6 ;
                           DUP 12 ;
                           DUP 12 ;
                           CAR ;
                           PAIR 3 ;
                           DUP 11 ;
                           GET 9 ;
                           SWAP ;
                           EXEC ;
                           DUP 7 ;
                           DUP 6 ;
                           DUP 13 ;
                           CAR ;
                           PAIR 3 ;
                           DUP 12 ;
                           GET 9 ;
                           SWAP ;
                           EXEC ;
                           DUP 8 ;
                           DUP 14 ;
                           PAIR ;
                           DUP 9 ;
                           DUP 8 ;
                           PAIR ;
                           DUP 10 ;
                           SENDER ;
                           DUP 17 ;
                           PAIR 3 ;
                           DUP 13 ;
                           DUP 4 ;
                           PAIR ;
                           DUP 14 ;
                           DUP 4 ;
                           PAIR ;
                           DUP 14 ;
                           DUP 4 ;
                           PAIR ;
                           DUP 13 ;
                           DIG 8 ;
                           SUB ;
                           ABS ;
                           DUP 13 ;
                           DIG 8 ;
                           ADD ;
                           DIG 4 ;
                           UNPAIR ;
                           GET ;
                           IF_NONE
                             { DUP 12 ;
                               NEG ;
                               DUG 7 ;
                               DIG 15 ;
                               DIG 8 ;
                               DIG 3 ;
                               PAIR ;
                               DIG 7 ;
                               DUG 2 ;
                               SOME ;
                               DIG 2 ;
                               UPDATE }
                             { DUP 13 ;
                               SWAP ;
                               CDR ;
                               SUB ;
                               DUG 7 ;
                               DIG 15 ;
                               DIG 8 ;
                               DIG 3 ;
                               PAIR ;
                               SOME ;
                               DIG 7 ;
                               UPDATE } ;
                           DUG 12 ;
                           DIG 2 ;
                           UNPAIR ;
                           GET ;
                           IF_NONE
                             { DUP 9 ;
                               INT ;
                               DUG 4 ;
                               DIG 12 ;
                               DIG 5 ;
                               DIG 2 ;
                               PAIR ;
                               DIG 4 ;
                               DUG 2 ;
                               SOME ;
                               DIG 2 ;
                               UPDATE }
                             { DUP 10 ;
                               SWAP ;
                               CDR ;
                               ADD ;
                               DUG 4 ;
                               DIG 12 ;
                               DIG 5 ;
                               DIG 2 ;
                               PAIR ;
                               SOME ;
                               DIG 4 ;
                               UPDATE } ;
                           DUG 9 ;
                           DUP 3 ;
                           DUP 6 ;
                           COMPARE ;
                           NEQ ;
                           IF { UNPAIR ;
                                GET ;
                                IF_NONE
                                  { DIG 3 ;
                                    DUP 3 ;
                                    SUB ;
                                    SWAP ;
                                    DIG 7 ;
                                    DIG 2 ;
                                    DIG 3 ;
                                    PAIR ;
                                    SOME ;
                                    DIG 2 ;
                                    UPDATE }
                                  { DIG 4 ;
                                    DUP 4 ;
                                    SUB ;
                                    SWAP ;
                                    CDR ;
                                    ADD ;
                                    SWAP ;
                                    DIG 7 ;
                                    DIG 2 ;
                                    DIG 3 ;
                                    PAIR ;
                                    SOME ;
                                    DIG 2 ;
                                    UPDATE } ;
                                DUG 4 }
                              { SWAP ; DIG 2 ; DIG 4 ; DROP 4 } ;
                           DUP 3 ;
                           DUP 5 ;
                           DUP 4 ;
                           DUP 12 ;
                           PAIR 4 ;
                           EMIT %transfer_event
                             (pair (address %from_) (address %to_) (nat %token_id) (nat %amount)) ;
                           NIL operation ;
                           DIG 8 ;
                           NIL operation ;
                           SWAP ;
                           ITER { CONS } ;
                           ITER { CONS } ;
                           SWAP ;
                           CONS ;
                           DUG 6 ;
                           DUP 3 ;
                           DUP 5 ;
                           DUP 11 ;
                           DUP 11 ;
                           CAR ;
                           PAIR 4 ;
                           DUP 9 ;
                           GET 7 ;
                           SWAP ;
                           EXEC ;
                           DIG 8 ;
                           SWAP ;
                           UPDATE 1 ;
                           DIG 5 ;
                           DIG 6 ;
                           DIG 7 ;
                           DIG 4 ;
                           DIG 6 ;
                           DIG 7 ;
                           DIG 7 ;
                           DUP 8 ;
                           CAR ;
                           PAIR 4 ;
                           DUP 6 ;
                           GET 5 ;
                           SWAP ;
                           EXEC ;
                           DIG 5 ;
                           SWAP ;
                           UPDATE 1 ;
                           PAIR 5 } ;
                    SWAP ;
                    DROP } ;
             DIG 3 ;
             DIG 4 ;
             DIG 5 ;
             DIG 6 ;
             DIG 7 ;
             DROP 5 ;
             UNPAIR 5 ;
             DIG 6 ;
             DIG 2 ;
             UPDATE 8 ;
             SWAP ;
             CAR ;
             UPDATE 3 ;
             NIL operation ;
             DIG 3 ;
             ITER { UNPAIR ;
                    PUSH int 0 ;
                    DUP 3 ;
                    CDR ;
                    COMPARE ;
                    NEQ ;
                    IF { DUP 2 ;
                         CDR ;
                         DIG 2 ;
                         CAR ;
                         DUP 3 ;
                         CDR ;
                         DIG 3 ;
                         CAR ;
                         PAIR 4 ;
                         EMIT %balance_update
                           (pair (address %owner) (nat %token_id) (nat %new_balance) (int %diff)) ;
                         NIL operation ;
                         DIG 2 ;
                         NIL operation ;
                         SWAP ;
                         ITER { CONS } ;
                         ITER { CONS } ;
                         SWAP ;
                         CONS }
                       { DROP 2 } } ;
             NIL operation ;
             DIG 4 ;
             ITER { UNPAIR ;
                    PUSH int 0 ;
                    DUP 3 ;
                    CDR ;
                    COMPARE ;
                    NEQ ;
                    IF { DUP 2 ;
                         CDR ;
                         DIG 2 ;
                         CAR ;
                         DUP 3 ;
                         GET 4 ;
                         DUP 4 ;
                         GET 3 ;
                         DIG 4 ;
                         CAR ;
                         PAIR 5 ;
                         EMIT %allowance_update
                           (pair (address %owner)
                                 (address %spender)
                                 (nat %token_id)
                                 (nat %new_allowance)
                                 (int %diff)) ;
                         NIL operation ;
                         DIG 2 ;
                         NIL operation ;
                         SWAP ;
                         ITER { CONS } ;
                         ITER { CONS } ;
                         SWAP ;
                         CONS }
                       { DROP 2 } } ;
             DIG 3 ;
             ITER { NIL operation ;
                    DIG 5 ;
                    NIL operation ;
                    SWAP ;
                    ITER { CONS } ;
                    ITER { CONS } ;
                    SWAP ;
                    CONS ;
                    DUG 3 } ;
             NIL operation ;
             DIG 4 ;
             NIL operation ;
             SWAP ;
             ITER { CONS } ;
             ITER { CONS } ;
             SWAP ;
             NIL operation ;
             SWAP ;
             ITER { CONS } ;
             ITER { CONS } ;
             DUG 2 ;
             NIL operation ;
             DIG 3 ;
             NIL operation ;
             SWAP ;
             ITER { CONS } ;
             ITER { CONS } ;
             SWAP ;
             NIL operation ;
             SWAP ;
             ITER { CONS } ;
             ITER { CONS } ;
             PAIR } ;
         DUP 11 ;
         DUP 11 ;
         DUP 11 ;
         DUP 11 ;
         DUP 11 ;
         DUP 11 ;
         PAIR 6 ;
         APPLY ;
         DIG 5 ;
         DIG 6 ;
         DIG 7 ;
         DIG 8 ;
         DIG 9 ;
         DIG 10 ;
         DROP 6 ;
         PAIR 5 ;
         SWAP ;
         UNPAIR ;
         IF_LEFT
           { PAIR ; SWAP ; GET 8 ; SWAP ; EXEC }
           { IF_LEFT
               { PAIR ; SWAP ; GET 7 ; SWAP ; EXEC }
               { IF_LEFT
                   { PAIR ; SWAP ; GET 5 ; SWAP ; EXEC }
                   { IF_LEFT
                       { PAIR ; SWAP ; GET 3 ; SWAP ; EXEC }
                       { PAIR ; SWAP ; CAR ; SWAP ; EXEC } } } } } ;
  view "get_balance"
       (pair (address %owner) (nat %token_id))
       nat
       { UNPAIR ;
         SWAP ;
         GET 3 ;
         DUP 2 ;
         CDR ;
         GET ;
         IF_NONE
           { DROP ; PUSH nat 0 }
           { SWAP ;
             CAR ;
             SWAP ;
             COMPARE ;
             EQ ;
             IF { PUSH nat 1 } { PUSH nat 0 } } } ;
  view "get_total_supply"
       nat
       nat
       { UNPAIR ;
         SWAP ;
         GET 3 ;
         SWAP ;
         GET ;
         IF_NONE { NONE nat } { DROP ; PUSH nat 1 ; SOME } ;
         IF_NONE { PUSH nat 0 } {} } ;
  view "is_operator"
       (pair (address %owner) (address %operator) (nat %token_id))
       bool
       { UNPAIR ;
         SWAP ;
         GET 7 ;
         IF_NONE
           { DROP ; PUSH bool False }
           { DUP 2 ;
             GET 4 ;
             DUP 3 ;
             CAR ;
             PAIR ;
             GET ;
             IF_NONE { DROP ; PUSH bool False } { SWAP ; GET 3 ; MEM } } } ;
  view "get_allowance"
       (pair (address %owner) (address %spender) (nat %token_id))
       nat
       { UNPAIR ; SWAP ; GET 8 ; SWAP ; GET ; IF_NONE { PUSH nat 0 } {} } ;
  view "get_token_metadata"
       nat
       (map string bytes)
       { UNPAIR ;
         SWAP ;
         GET 5 ;
         SWAP ;
         GET ;
         IF_NONE { EMPTY_MAP string bytes } { CDR } } ;
  view "is_token"
       nat
       bool
       { UNPAIR ;
         SWAP ;
         GET 3 ;
         SWAP ;
         GET ;
         IF_NONE { NONE nat } { DROP ; PUSH nat 1 ; SOME } ;
         IF_NONE { PUSH bool False } { DROP ; PUSH bool True } } }
`
const metadata = new MichelsonMap()
metadata.set('', char2Bytes('tezos-storage:content'))
metadata.set(
  'content',
  char2Bytes(
    JSON.stringify({
      version: 'v1.0',
      name: 'Test NFT Contract',
      authors: [],
      homepage: 'https://',
      interfaces: ['TZIP-012', 'TZIP-016'],
      license: {
        name: 'MIT',
      },
      views: ['get_balance'],
    }),
  ),
)

const deploy = async () => {
  await importKey(Tezos, privateKey)
  return Tezos.contract
    .originate({
      code: contract,
      storage: {
        metadata: [],
        assets: [],
        token_metadata: [],
        operators: [],
        approvals: [],
      },
    })
    .then(originationOp => {
      console.log(`Waiting for confirmation of origination for ${originationOp.contractAddress}...`)
      return originationOp.contract()
    })
    .then(contract => {
      console.log(contract)
      console.log(`Origination completed.`)
    })
    .catch(error => console.log(`Error: ${JSON.stringify(error, null, 2)}`))
}

deploy()

// const signer = new InMemorySigner("REPLACE WITH LOCAL SANDBOX KEY");
// const bytes = "0xc0050707070707070a0000001601b752c7f3de31759bce246416a6823e86b9756c6c00000107070a0000000e5550444154454420504f4c4943590a00000016011d4eb86a702a4c4342943b4b1d9ef41ca299b641000707000000848b95ca0c";
// const signature = signer.sign(bytes).then(console.log);
