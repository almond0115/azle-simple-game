import {
  nat64,
  Record,
  update,
  ic,
  StableBTreeMap,
  Vec,
  Canister,
  text,
  bool,
  query,
  Opt,
} from "azle";

export const Allowances = Record({
  spender: text, // 내가 사용하도록 승인해준 사람의 주소
  amount: nat64, // 내가 사용하도록 승인해준 토큰의 양
});

export const Account = Record({
  address: text,                
  balance: nat64,               // 토큰 잔액
  allowances: Vec(Allowances),  // 내가 승인해준 토큰
});

let state = StableBTreeMap(text, Account, 0);   // stable memory
const admins: Vec<string> = []; // minting, bunning

const tokenInfo = {
  name: "",
  ticker: "",
  totalSupply: 0n,
  owner: "",
};

function isAdmin(address: string): boolean {
  if (admins.indexOf(address) == -1) {
    return false;
  }
  return true;
}

// Canister initialize 함수를 호출한 사람의 identity 주소
function getCaller(): string {
  const caller = ic.caller().toString();
  if (caller === null) {
    throw new Error("Caller is null");
  }
  return caller;
}

function getAccountByAddress(address: text): Opt<typeof Account> {
  return state.get(address);
}

function insertAccount(address: text, account: typeof Account): typeof Account {
  state.insert(address, account);
  const newAccountOpt = getAccountByAddress(address);
  if ("None" in newAccountOpt) {
    throw new Error("Insert failed");
  }
  return newAccountOpt.Some;
}

function _allowance(owner: string, spender: string): nat64 {
  /*
   * TO-DO: 토큰을 얼마나 approve 했는지 확인합니다.
   * approve하지 않았다면 0n을 반환합니다.
   */

  // 1. ownerAccount를 가져온다.
  const ownerAccountOpt = getAccountByAddress(owner);
  if('None' in ownerAccountOpt){
    throw new Error("Owner Account")
  }

  // 2. allowance가 있는지 확인한다.
  return 0n;
}

function _transferFrom(from: text, to: text, amount: nat64): bool {
  /*
   * TO-DO: approve 받은 토큰을 전송 합니다.
   * 전송 후 allowance를 갱신하는 것을 잊지 마세요!
   */

  // 1. spender (=caller)의 계정을 가져온다.
  const spender = getCaller();
  const spenderAccountOpt = getAccountByAddress(spender);
  if('None' in spenderAccountOpt){
    throw new Error('spender Account Not Found');
  }
  const spenderAccount = spenderAccountOpt.Some;

  // 2. from 의 계정을 가져온다.
  const fromAccountOpt = getAccountByAddress(from);
  if('None' in fromAccountOpt) {
    throw new Error ('From Account Not Found')
  }
  const fromAccount = fromAccountOpt.Some;

  // 3. 받는 사람의 계정을 가져온다.
  // 3-1. 받는 사람의 계정이 없으면 새로 만들어준다.
  let toAccountOpt = getAccountByAddress(to)
  let toAccount;

  if ('None' in toAccountOpt){
    // 수신 계정이 없으면 새로 만들기
    const newToAccount: typeof Account = {
      address: to,
      balance: 0n,
      allowances: [],
    };
    toAccount = insertAccount(to, newToAccount);
  } else {
    toAccount = toAccountOpt.Some;
  }
  // 4. allowance가 부족한 경우 -> transferFrom 수행 중지
const allowance = _allowance(from, spender);
if (allowance === undefined || allowance < amount){
  return false;
}

  // 5. fromAccount-spender 간의 allowance 갱신
  for (let i=0 ; i < fromAccount.allowances.length ; i++) {
    if (fromAccount.allowances[i].spender === spender){
      fromAccount.allowances[i] = {
        spender,
        amount: fromAccount.allowances[i].amount - amount,
      };
    }
  }

  // 6. 실제로 transfer 진행
  fromAccount.balance -= amount;
  fromAccount.balance += amount;

  insertAccount(from, fromAccount);
  insertAccount(to, toAccount);

  return true;
}

export default Canister({
  allState: query([], Vec(Account), () => {
    return state.values();
  }),

  getAdmins: query([], Vec(text), () => {
    return admins;
  }),

  addAdmin: update([text], bool, (address) => {
    /*
     * TO-DO: admin을 추가합니다.
     * admin을 추가하거나 삭제하는 작업은 admin 권한을 가진 사용자만 실행할 수 있어야 합니다.
     */

    return true;
  }),

  deleteAdmin: update([text], bool, (address) => {
    /*
     * TO-DO: admin을 삭제합니다.
     * admin을 추가하거나 삭제하는 작업은 admin 권한을 가진 사용자만 실행할 수 있어야 합니다.
     */
    const caller = getCaller();

    if (!isAdmin(caller)) {
      return false;
    }

    const indexToDelete = admins.indexOf(address);

    if (indexToDelete !== -1) {
      admins.splice(indexToDelete, 1);
    }

    return true;
  }),

  initialize: update([text, text, nat64], text, (name, ticker, totalSupply) => {
    const ownerAddress = getCaller();

    const creatorAccount: typeof Account = {
      address: ownerAddress,
      balance: totalSupply,
      allowances: [],
    };

    tokenInfo.name = name;
    tokenInfo.ticker = ticker;
    tokenInfo.totalSupply = totalSupply;
    tokenInfo.owner = ownerAddress;

    insertAccount(ownerAddress, creatorAccount);

    admins.push(ownerAddress);

    return ownerAddress;
  }),

  name: query([], text, () => {
    return tokenInfo.name;
  }),

  ticker: query([], text, () => {
    return tokenInfo.ticker;
  }),

  totalSupply: query([], nat64, () => {
    return tokenInfo.totalSupply;
  }),

  owner: query([], text, () => {
    return tokenInfo.owner;
  }),

  balanceOf: query([text], nat64, (address) => {
    /*
     * TO-DO: 계정의 주소를 반환합니다.
     * getAccountByAddress() 함수를 사용하세요.
     * state에 사용자 정보가 없는 경우, 0을 반환합니다.
     */

    // 1. 인자로 주어진 address에 해당하는 account를 가져온다.
    const accountOpt = getAccountByAddress(address) // Opt 형태는 있을 수도 있고 없을 수도 있다는 의미
    // 2. 없다면 0을 반환한다.
    if ('None' in accountOpt){
      return 0n;
    }
    // 3.  있으면 해당되는 Balance를 반환한다.
    return accountOpt.Some.balance;
  }),

  transfer: update([text, nat64], bool, (to, amount) => {
    /*
     * TO-DO: 토큰을 전송합니다.
     * getAccountByAddress() 함수를 사용하세요.
     */

    // 1. 보내는 사람과 받는 사람의 account를 가져오기
    const fromAddress = getCaller();
    const fromAccountOpt = getAccountByAddress(fromAddress);
    if('None' in fromAccountOpt){
      throw new Error("fromAccount not found");
    }
    const fromAccount = fromAccountOpt.Some;

    // 받는 사람이 계정이 없어도 받을 수 있어야 한다!
    let toAccountOpt = getAccountByAddress(to)
    let toAccount;

    if ('None' in toAccountOpt){
      // 수신 계정이 없으면 새로 만들기
      const newToAccount: typeof Account = {
        address: to,
        balance: 0n,
        allowances: [],
      };

      toAccount = insertAccount(to, newToAccount) // 'insertAccount' 함수는 받는 사람의 객체를 반환
    } else {
      toAccount = toAccountOpt.Some;
    }

    // 2. 보내는 사람이 충분한 양의 잔액을 가지고 있는지 (유효성 검사)
    if (!fromAccount || fromAccount.balance < amount){
      return false;
    }

    // 3. 실제 토큰 전송
    fromAccount.balance -= amount;
    toAccount.balance += amount;

    // 2개의 Account의 속성 변경해주었으므로 다시 insertAccount를 통해 재반영
    insertAccount(fromAddress, fromAccount);
    insertAccount(to, toAccount);
    return true;
  }),

  approve: update([text, nat64], bool, (spender, amount) => {
    /*
     * TO-DO: 토큰을 approve 합니다.
     * 기존에 owner가 spender에게 토큰을 approve한 경우, 기존의 값을 덮어 씌워야 합니다.
     */

    // 1. owner (= caller)의 account 가져오기
    const ownerAdderss = getCaller();
    const ownerAccountOpt = getAccountByAddress(ownerAdderss);

    if ('None' in ownerAccountOpt) {
      throw new Error("owner Account Not Fount");
    }

    const ownerAccount = ownerAccountOpt.Some;

    // 2. spender (= 승인 받을 사람)의 account 가져오기
    // 2-1. spender가 계정이 없으면 우리가 계정을 만들어줌
    const spenderAccountOpt = getAccountByAddress(spender);
    let spenderAccount;
    if('None' in spenderAccountOpt) {
      // 새 계정을 만들어준다.

      const newSpenderAccount: typeof Account = {
        address: spender,
        balance: 0n,
        allowances: [],
      };

      spenderAccount = insertAccount(spender, newSpenderAccount)
    } else {
      spenderAccount = spenderAccountOpt.Some;
    }

    // 3. owner가 충분한 양의 토큰을 가지고 있는지 확인
    if (!ownerAccount || ownerAccount.balance < amount) {
      return false;
    }

    // 4. approve (승인)
    // 기존에 owner가 spender에게 토큰을 approve 한 경우, 기존의 값을 덮어 씌워야 합니다.
    let exist = false;
    for (let i = 0 ; i < ownerAccount.allowances.length ; i++){
      const key = ownerAccount.allowances[i].spender
      
      if (key == spender) {
        exist = true;
        ownerAccount.allowances[i] = { spender, amount };
      } 
    }

    // 처음 approve 한 경우 -> 새롭게 추가
    if (!exist){
      ownerAccount.allowances.push({ spender, amount});
    }

    insertAccount(ownerAdderss, ownerAccount);

    return true;
  }),

  allowance: query([text, text], nat64, (owner, spender) => {
    return _allowance(owner, spender);
  }),

  // owner -> 호출자 에 대한 allowance
  allowanceFrom: query([text], nat64, (owner) => {
    /*
     * TO-DO: 인자로 주어진 owner가 함수를 호출한 caller에게 토큰을 얼마나 approve 해주었는지 확인합니다.
     * allowanceFrom() 함수는 주로 캐니스터 컨트랙트에서 "사용자가 캐니스터에 얼마나 approve 했는지"(사용자 -> 캐니스터) 확인할 때 사용합니다.
     */

    // 1. 함수 호출자 (=caller)가 계정이 있는지 확인

    // 계정이 없으면 0

    // 계정이 있으면 allowance 반환

    const spender = getCaller()
    const spenderAccountOpt = getAccountByAddress(spender)
    if('None' in spenderAccountOpt) {
      return 0n;
    } else {
      return _allowance(owner, spender);
    }
  }),

  transferFrom: update([text, text, nat64], bool, (from, to, amount) => {
    return _transferFrom(from, to, amount);
  }),

  mint: update([text, nat64], bool, (to, amount) => {
    /*
     * TO-DO: 새로운 토큰을 to에게 발행합니다.
     * mint 함수는 admin 권한이 있는 계정만 호출할 수 있습니다.
     */
    const caller = getCaller();

    // mint 함수는 admin인 계정만 호출할 수 있습니다.
    if (admins.indexOf(caller) == -1) {
      throw new Error("Only admins can mint new tokens");
    }

    const callerAccountOpt = getAccountByAddress(caller);

    if ("None" in callerAccountOpt) {
      throw new Error("Caller account not found");
    }
    const callerAccount = callerAccountOpt.Some;

    const toAccountOpt = getAccountByAddress(to);
    if ("None" in toAccountOpt) {
      throw new Error("Recipient account not found");
    }
    const toAccount = toAccountOpt.Some;

    toAccount.balance += amount; // 전체 발행된 token
    tokenInfo.totalSupply += amount;

    insertAccount(to, toAccount);

    return true;
  }),

  burn: update([text, nat64], bool, (from, amount) => {
    /*
     * TO-DO: from이 소유한 일정량의 토큰을 소각합니다.
     * burn 함수는 admin 권한이 있는 계정만 호출할 수 있습니다.
     */
    const caller = getCaller();

    // burn 함수는 admin인 계정만 호출할 수 있습니다.
    if (admins.indexOf(caller) == -1) {
      throw new Error("Only admins can burn tokens");
    }

    const callerAccountOpt = getAccountByAddress(caller);

    if ("None" in callerAccountOpt) {
      throw new Error("Caller account not found");
    }
    const callerAccount = callerAccountOpt.Some;

    if (_allowance(from, caller) < amount) {
      throw new Error("Insufficient allowance to burn");
    }

    if (tokenInfo.totalSupply < amount) {
      throw new Error("Insufficient tokens to burn");
    }
    _transferFrom(from, "0", amount); 
    tokenInfo.totalSupply -= amount;

    insertAccount(caller, callerAccount);

    return true;
  }),
});
