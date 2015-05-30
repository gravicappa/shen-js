(define def-character
  -> (let Constr (js.' "function Character(name, action) {
                          this.name = name;
                          this.action = action;
                        }")
          . (js.set (js. Constr prototype act)
                    (js.' "function() {
                             vm.print('This is ' + this.name
                                       + '. And he is '
                                       + this.action + '.\n');
                           }"))
        Constr))

(define act
  [] -> true
  [Ch | Chs] -> (do (js. Ch (js.call act))
                    (act Chs)))

(set character (def-character))

(define act-all
  -> (act [(js.new (value character) "Rinswind" "running")
           (js.new (value character) "Detritus" "waving someone")
           (js.new (value character) "Angua" "sniffing")
           (js.new (value character) "Gaspode" "muttering")
           (js.new (value character) "Vetinari" "staring")]))

(act-all)
