package expo.modules.tuyadevicepairing

import android.app.Application
import com.thingclips.smart.android.user.api.ILoginCallback
import com.thingclips.smart.android.user.api.IRegisterCallback
import com.thingclips.smart.sdk.api.IResultCallback
import com.thingclips.smart.home.sdk.api.IThingHomeManager
import com.thingclips.smart.home.sdk.bean.HomeBean
import com.thingclips.smart.home.sdk.builder.ActivatorBuilder
import com.thingclips.smart.home.sdk.callback.IThingGetHomeListCallback
import com.thingclips.smart.home.sdk.callback.IThingHomeResultCallback
import com.thingclips.smart.home.sdk.ThingHomeSdk
import com.thingclips.smart.sdk.api.IThingActivator
import com.thingclips.smart.sdk.api.IThingActivatorGetToken
import com.thingclips.smart.sdk.api.IThingSmartActivatorListener
import com.thingclips.smart.sdk.bean.DeviceBean
import com.thingclips.smart.sdk.enums.ActivatorModelEnum
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TuyaDevicePairingModule : Module() {
  private var initialized = false
  private var activator: IThingActivator? = null

  private fun application(): Application {
    return appContext.reactContext?.applicationContext as? Application
      ?: throw IllegalStateException("Android application context is unavailable")
  }

  private fun ensureInitialized() {
    if (!initialized) {
      ThingHomeSdk.init(application())
      initialized = true
    }
  }

  private fun homeMap(home: HomeBean): Map<String, Any> = mapOf(
    "homeId" to home.homeId,
    "name" to home.name.orEmpty(),
  )

  override fun definition() = ModuleDefinition {
    Name("TuyaDevicePairing")
    Events("onPairingProgress", "onPairingSuccess", "onPairingError")

    Function("getStatus") {
      mapOf(
        "initialized" to initialized,
        "nativeBuild" to true,
      )
    }

    AsyncFunction("initialize") { promise: Promise ->
      try {
        ensureInitialized()
        promise.resolve(mapOf("initialized" to true, "nativeBuild" to true))
      } catch (error: Exception) {
        android.util.Log.e("SynapseTuya", "Tuya SDK initialization failed", error)
        promise.reject("ERR_TUYA_INITIALIZATION", error.message ?: "Unable to initialize the Tuya Android SDK", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("sendRegistrationCode") { countryCode: String, email: String, promise: Promise ->
      try {
        ensureInitialized()
        require(countryCode.matches(Regex("[0-9]{1,4}"))) { "Enter a valid country code" }
        require(android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) { "Enter a valid email address" }
        ThingHomeSdk.getUserInstance().sendVerifyCodeWithUserName(email, "", countryCode, 1, object : IResultCallback {
          override fun onSuccess() {
            promise.resolve(mapOf("sent" to true))
          }
          override fun onError(code: String, error: String) {
            promise.reject("ERR_TUYA_CODE_$code", error, null)
          }
        })
      } catch (error: Exception) {
        promise.reject("ERR_TUYA_CODE", error.message ?: "Unable to send verification code", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("registerWithEmail") { countryCode: String, email: String, password: String, code: String, promise: Promise ->
      try {
        ensureInitialized()
        require(countryCode.matches(Regex("[0-9]{1,4}"))) { "Enter a valid country code" }
        require(android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) { "Enter a valid email address" }
        require(password.isNotBlank()) { "Choose a password for this app account" }
        require(code.matches(Regex("[0-9]{6}"))) { "Enter the 6-digit verification code" }
        ThingHomeSdk.getUserInstance().registerAccountWithEmail(countryCode, email, password, code, object : IRegisterCallback {
          override fun onSuccess(user: com.thingclips.smart.android.user.bean.User) {
            promise.resolve(mapOf("registered" to true))
          }
          override fun onError(code: String, error: String) {
            promise.reject("ERR_TUYA_REGISTER_$code", error, null)
          }
        })
      } catch (error: Exception) {
        promise.reject("ERR_TUYA_REGISTER", error.message ?: "Unable to register account", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("loginWithEmail") { countryCode: String, email: String, password: String, promise: Promise ->
      try {
        ensureInitialized()
        require(countryCode.isNotBlank()) { "Country code is required" }
        require(email.isNotBlank()) { "Email is required" }
        require(password.isNotBlank()) { "Password is required" }

        ThingHomeSdk.getUserInstance().loginWithEmail(countryCode, email, password, object : ILoginCallback {
          override fun onSuccess(user: com.thingclips.smart.android.user.bean.User) {
            promise.resolve(mapOf("loggedIn" to true))
          }

          override fun onError(code: String, error: String) {
            promise.reject("ERR_TUYA_LOGIN_$code", error, null)
          }
        })
      } catch (error: Exception) {
        promise.reject("ERR_TUYA_LOGIN", error.message ?: "Unable to sign in to Tuya", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("listHomes") { promise: Promise ->
      try {
        ensureInitialized()
        ThingHomeSdk.getHomeManagerInstance().queryHomeList(object : IThingGetHomeListCallback {
          override fun onSuccess(homes: List<HomeBean>) {
            promise.resolve(homes.map(::homeMap))
          }

          override fun onError(code: String, error: String) {
            promise.reject("ERR_TUYA_HOME_LIST_$code", error, null)
          }
        })
      } catch (error: Exception) {
        promise.reject("ERR_TUYA_HOME_LIST", error.message ?: "Unable to load Tuya homes", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("createHome") { name: String, promise: Promise ->
      try {
        ensureInitialized()
        require(name.isNotBlank()) { "Home name is required" }
        val homeManager: IThingHomeManager = ThingHomeSdk.getHomeManagerInstance()
        homeManager.createHome(name, 0.0, 0.0, "", emptyList(), object : IThingHomeResultCallback {
          override fun onSuccess(home: HomeBean) {
            promise.resolve(homeMap(home))
          }

          override fun onError(code: String, error: String) {
            promise.reject("ERR_TUYA_HOME_CREATE_$code", error, null)
          }
        })
      } catch (error: Exception) {
        promise.reject("ERR_TUYA_HOME_CREATE", error.message ?: "Unable to create a Tuya home", error)
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startEzPairing") { homeId: Long, ssid: String, password: String, promise: Promise ->
      try {
        ensureInitialized()
        require(homeId > 0) { "Select a Tuya home first" }
        require(ssid.isNotBlank()) { "Wi-Fi network name is required" }

        activator?.stop()
        activator?.onDestroy()
        activator = null

        ThingHomeSdk.getActivatorInstance().getActivatorToken(homeId, object : IThingActivatorGetToken {
          override fun onSuccess(token: String) {
            try {
              val listener = object : IThingSmartActivatorListener {
                override fun onError(code: String, error: String) {
                  sendEvent("onPairingError", mapOf("code" to code, "message" to error))
                }

                override fun onActiveSuccess(device: DeviceBean) {
                  sendEvent("onPairingSuccess", mapOf(
                    "deviceId" to device.devId.orEmpty(),
                    "name" to device.name.orEmpty(),
                  ))
                }

                override fun onStep(step: String, data: Any?) {
                  sendEvent("onPairingProgress", mapOf("step" to step))
                }
              }
              val builder = ActivatorBuilder()
                .setContext(application())
                .setSsid(ssid)
                .setPassword(password)
                .setToken(token)
                .setTimeOut(100)
                .setActivatorModel(ActivatorModelEnum.THING_EZ)
                .setListener(listener)

              activator = ThingHomeSdk.getActivatorInstance().newMultiActivator(builder)
              activator?.start()
              promise.resolve(mapOf("started" to true, "timeoutSeconds" to 100))
            } catch (error: Exception) {
              promise.reject("ERR_TUYA_PAIRING", error.message ?: "Unable to start Tuya pairing", error)
            }
          }

          override fun onFailure(code: String, error: String) {
            promise.reject("ERR_TUYA_PAIRING_TOKEN_$code", error, null)
          }
        })
      } catch (error: Exception) {
        promise.reject("ERR_TUYA_PAIRING", error.message ?: "Unable to start Tuya pairing", error)
      }
    }.runOnQueue(Queues.MAIN)

    Function("stopPairing") {
      activator?.stop()
      activator?.onDestroy()
      activator = null
      mapOf("stopped" to true)
    }
  }
}
